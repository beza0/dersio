import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DateTime } from 'luxon';
import { register, type TestCtx, startApp } from './helpers';

let ctx: TestCtx;
beforeAll(async () => {
  ctx = await startApp();
});
afterAll(async () => ctx.close());

describe('Giriş hata mesajları', () => {
  it('kayıtlı olmayan e-posta ve yanlış parola ayrı mesaj verir', async () => {
    const t = await register(ctx, 'teacher', 'Mesaj Hoca');
    const none = await ctx.http().post('/api/auth/login').send({ email: 'yok.boyle.biri@example.test', password: 'cok-gizli-parola-123' });
    expect(none.status).toBe(401);
    expect(none.body.error.message).toContain('kayıtlı bir hesap yok');
    const wrong = await ctx.http().post('/api/auth/login').send({ email: t.email.toUpperCase(), password: 'yanlis-parola-0000' });
    expect(wrong.status).toBe(401);
    expect(wrong.body.error.message).toContain('Parola yanlış');
  });

  it('parola sıfırlama e-postası bağlantı içerir ve bağlantıyla parola değişir', async () => {
    const t = await register(ctx, 'teacher', 'Sıfır Hoca');
    await ctx.http().post('/api/auth/request-password-reset').send({ email: t.email }).expect(204);
    const mail = ctx.mail.outbox.filter((m) => m.to === t.email).at(-1)!;
    const token = /token=([\w-]+)/.exec(mail.text)![1]!;
    await ctx.http().post('/api/auth/reset-password').send({ token, password: 'yepyeni-parola-456' }).expect(204);
    await ctx.http().post('/api/auth/login').send({ email: t.email, password: 'yepyeni-parola-456' }).expect(200);
  });
});

describe('Giriş gerektirmeyen veli bağlantısı', () => {
  it('bağlantıyla oturum açılır, yalnızca o öğrenci görünür, kaldırınca erişim biter', async () => {
    const t = await register(ctx, 'teacher', 'Bağlantı Hoca');
    const elif = (await ctx.http().post('/api/students').set(t.auth).send({ displayName: 'Elif' })).body;
    const start = DateTime.now().setZone('Europe/Istanbul').plus({ days: 2 });
    await ctx
      .http()
      .post('/api/lessons')
      .set(t.auth)
      .send({ studentId: elif.id, date: start.toFormat('yyyy-MM-dd'), startTime: '10:00', durationMin: 60 })
      .expect(201);
    await ctx.http().post('/api/notes').set(t.auth).send({ studentId: elif.id, body: 'Gizli öğretmen notu', visibility: 'private' });
    await ctx.http().post('/api/notes').set(t.auth).send({ studentId: elif.id, body: 'Veliye: harika gidiyor', visibility: 'student_guardian' });

    const link = await ctx.http().post(`/api/students/${elif.id}/guardian-access-links`).set(t.auth).send({});
    expect(link.status).toBe(201);
    const token = link.body.url.split('/v/')[1] as string;

    const bad = await ctx.http().post('/api/auth/guardian-access').set('X-Client', 'mobile').send({ token: 'x'.repeat(43) });
    expect(bad.status).toBe(400);

    const s = await ctx.http().post('/api/auth/guardian-access').set('X-Client', 'mobile').send({ token });
    expect(s.status).toBe(200);
    const g = { Authorization: `Bearer ${s.body.accessToken}` };
    const me = (await ctx.http().get('/api/me').set(g)).body;
    expect(me.user.isGuest).toBe(true);
    expect(me.user.email).toBe('');
    expect(me.contexts.guardianLinks).toHaveLength(1);

    const from = encodeURIComponent(DateTime.now().toUTC().toISO()!);
    const to = encodeURIComponent(DateTime.now().plus({ days: 7 }).toUTC().toISO()!);
    expect((await ctx.http().get(`/api/portal/calendar?from=${from}&to=${to}`).set(g)).body).toHaveLength(1);
    const notes = (await ctx.http().get('/api/portal/notes').set(g)).body as { body: string }[];
    expect(notes.map((n) => n.body)).toEqual(['Veliye: harika gidiyor']);
    // Misafir veli öğretmen uçlarına erişemez
    expect((await ctx.http().get('/api/students').set(g)).status).toBe(403);

    // Aynı bağlantı tekrar açılabilir (başka cihaz)
    expect((await ctx.http().post('/api/auth/guardian-access').set('X-Client', 'mobile').send({ token })).status).toBe(200);

    const list = (await ctx.http().get(`/api/students/${elif.id}/guardians`).set(t.auth)).body;
    expect(list).toHaveLength(1);
    expect(list[0].viaLink).toBe(true);
    await ctx.http().delete(`/api/students/${elif.id}/guardians/${list[0].id}`).set(t.auth).expect(204);

    expect((await ctx.http().get('/api/me').set(g)).status).toBe(401);
    expect((await ctx.http().post('/api/auth/guardian-access').send({ token })).status).toBe(400);
  });
});
