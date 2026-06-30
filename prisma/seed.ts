import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

// Seeds the Owner / Editor / Viewer demo trio sharing one document — used for the
// RBAC demo and the E2E/integration tests. Idempotent (safe to re-run).
const prisma = new PrismaClient()

const DEMO_PASSWORD = 'password123'

const demoUsers = [
  { email: 'owner@demo.test', name: 'Olivia Owner' },
  { email: 'editor@demo.test', name: 'Eddie Editor' },
  { email: 'viewer@demo.test', name: 'Vera Viewer' }
]

const main = async () => {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10)

  const [owner, editor, viewer] = await Promise.all(
    demoUsers.map((user) =>
      prisma.user.upsert({
        where: { email: user.email },
        update: { name: user.name, passwordHash },
        create: { email: user.email, name: user.name, passwordHash }
      })
    )
  )

  let document = await prisma.document.findFirst({
    where: { title: 'Welcome to Conflux', ownerId: owner.id }
  })

  if (!document) {
    document = await prisma.document.create({
      data: {
        title: 'Welcome to Conflux',
        ownerId: owner.id,
        memberships: {
          create: [
            { userId: owner.id, role: 'OWNER' },
            { userId: editor.id, role: 'EDITOR' },
            { userId: viewer.id, role: 'VIEWER' }
          ]
        }
      }
    })
  }

  console.log('Seed complete.')
  console.log(`  Demo document id: ${document.id}`)
  console.log(`  Logins (password: ${DEMO_PASSWORD}):`)
  demoUsers.forEach((user) => console.log(`    - ${user.email}`))
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
