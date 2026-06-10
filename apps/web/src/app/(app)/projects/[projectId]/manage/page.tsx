'use client';

import { redirect, useParams } from 'next/navigation';

export default function ManageIndexPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  redirect(`/projects/${projectId}/manage/team`);
}
