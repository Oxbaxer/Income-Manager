import { FastifyRequest, FastifyReply } from 'fastify'

export async function authenticate(req: FastifyRequest, reply: FastifyReply) {
  try {
    await req.jwtVerify()
    const payload = req.user as any
    if (payload.type !== 'access') {
      return reply.code(401).send({ error: 'Invalid token type' })
    }
  } catch {
    return reply.code(401).send({ error: 'Unauthorized' })
  }
}

export async function requireAdmin(req: FastifyRequest, reply: FastifyReply) {
  if ((req.user as any).role !== 'admin') {
    return reply.code(403).send({ error: 'Admin required' })
  }
}
