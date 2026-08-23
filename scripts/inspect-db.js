'use strict';
// Liệt kê những gì đang có trong DB trước khi xóa. Chỉ đọc, không sửa gì.
// Chạy bằng: node scripts/inspect-db.js
require('dotenv').config({ path: require('node:path').join(__dirname, '..', '.env') });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  const [submissions, reviews, revisions, cleanupJobs, reviewers, config] = await Promise.all([
    prisma.submission.findMany({
      select: { mssv: true, fullName: true, className: true, status: true, createdAt: true, evidenceImages: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.submissionReview.count(),
    prisma.submissionReviewRevision.count(),
    prisma.storageCleanupJob.count(),
    prisma.adminReviewer.count(),
    prisma.appConfig.findFirst({ select: { key: true, reportYear: true, activityCatalog: true } }),
  ]);

  console.log('--- SE BI XOA ---');
  console.log(`Submission            : ${submissions.length} dong`);
  for (const s of submissions) {
    const anh = Object.keys(s.evidenceImages || {}).length;
    console.log(`  ${s.createdAt.toISOString().slice(0, 16).replace('T', ' ')}  ${s.mssv}  ${s.fullName} (${s.className})  [${s.status}]  ${anh} anh`);
  }
  console.log(`SubmissionReview      : ${reviews} dong (tu xoa theo cascade)`);
  console.log(`SubmissionReviewRevision: ${revisions} dong (tu xoa theo cascade)`);
  console.log(`StorageCleanupJob     : ${cleanupJobs} dong (tro toi anh Supabase cu)`);

  console.log('\n--- GIU NGUYEN ---');
  const catalogGroups = config?.activityCatalog ? Object.keys(config.activityCatalog).length : 0;
  console.log(`AppConfig             : ${config ? `co (nam bao cao ${config.reportYear}, danh muc ${catalogGroups} nhom)` : 'chua co'}`);
  console.log(`AdminReviewer         : ${reviewers} nguoi`);

  await prisma.$disconnect();
})().catch(async (err) => {
  console.error('LOI:', err.message);
  await prisma.$disconnect();
  process.exit(1);
});
