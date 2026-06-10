'use client';

import React from 'react';
import Link from 'next/link';
import { Activity } from 'lucide-react';

interface ActivityItemProps {
  id?: string;
  action: string;
  actor: string;
  project?: string;
  timestamp: string;
  projectId?: string;
  taskId?: string;
  taskCode?: string;
  sourceTaskId?: string;
  sourceTaskCode?: string;
  targetTaskId?: string;
  targetTaskCode?: string;
  minimal?: boolean;
}

function getRelativeTime(timestamp: string) {
  if (!timestamp) return 'Recent';
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return timestamp; // fallback if already relative
  
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 60) {
    return `${Math.max(1, diffMins)}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else {
    return `${diffDays}d ago`;
  }
}

export function ActivityItem({
  action,
  actor,
  project,
  timestamp,
  projectId,
  taskId,
  taskCode,
  sourceTaskId,
  sourceTaskCode,
  targetTaskId,
  targetTaskCode,
  minimal = false
}: ActivityItemProps) {
  
  const formattedTaskCode = taskCode || (taskId ? `CP-${taskId.slice(0, 4).toUpperCase()}` : '');
  const formattedSourceCode = sourceTaskCode || (sourceTaskId ? `CP-${sourceTaskId.slice(0, 4).toUpperCase()}` : '');
  const formattedTargetCode = targetTaskCode || (targetTaskId ? `CP-${targetTaskId.slice(0, 4).toUpperCase()}` : '');

  const taskLinkElement = (tid: string, code: string) => {
    if (!projectId) return <span className="font-mono text-[11px] font-semibold text-black bg-[#f6f5f4] border border-[#e6e6e6] px-1.5 py-0.5 rounded inline-flex align-middle">{code}</span>;
    return (
      <Link
        href={`/projects/${projectId}/tasks?task=${tid}`}
        className="font-mono text-[11px] font-semibold text-[#000000] hover:bg-[#e6e6e6] hover:underline bg-[#f6f5f4] border border-[#e6e6e6] px-1.5 py-0.5 rounded shrink-0 mx-1 align-middle inline-flex items-center transition-colors cursor-pointer"
      >
        {code}
      </Link>
    );
  };

  const actionUpper = action.toUpperCase();
  let line1: React.ReactNode = action;

  if (actionUpper.startsWith('DEPENDENCY_ADDED') || actionUpper.startsWith('DEPENDENCY_REMOVED')) {
    const isAdded = actionUpper.startsWith('DEPENDENCY_ADDED');
    line1 = (
      <span>
        {isAdded ? 'Dependency Added: ' : 'Dependency Removed: '}
        {sourceTaskId ? taskLinkElement(sourceTaskId, formattedSourceCode) : 'Task'}
        <span className="text-[#a39e98] mx-1">→</span>
        {targetTaskId ? taskLinkElement(targetTaskId, formattedTargetCode) : 'Task'}
      </span>
    );
  } else if (actionUpper.startsWith('TASK_CREATED')) {
    line1 = (
      <span>
        Task Created: 
        {taskId ? taskLinkElement(taskId, formattedTaskCode) : ''}
      </span>
    );
  } else if (actionUpper.startsWith('STATUS_CHANGED')) {
    const transitionMatch = action.match(/\(([^)]+)\)/);
    const transition = transitionMatch ? ` (${transitionMatch[1]})` : "";
    line1 = (
      <span>
        Status Changed: 
        {taskId ? taskLinkElement(taskId, formattedTaskCode) : ''}
        {transition && <span className="text-[#615d59] font-medium">{transition}</span>}
      </span>
    );
  } else if (actionUpper.startsWith('COMMENT_ADDED')) {
    line1 = (
      <span>
        Comment Added: 
        {taskId ? taskLinkElement(taskId, formattedTaskCode) : ''}
      </span>
    );
  } else if (actionUpper.startsWith('ASSIGNEE_CHANGED')) {
    line1 = (
      <span>
        Assignee Changed: 
        {taskId ? taskLinkElement(taskId, formattedTaskCode) : ''}
      </span>
    );
  } else if (actionUpper.startsWith('TASK_UPDATED')) {
    const fieldsMatch = action.match(/\(([^)]+)\)/);
    const fields = fieldsMatch ? ` (${fieldsMatch[1]})` : "";
    line1 = (
      <span>
        Task Updated: 
        {taskId ? taskLinkElement(taskId, formattedTaskCode) : ''}
        {fields && <span className="text-[#615d59] font-medium ml-1">{fields}</span>}
      </span>
    );
  } else if (actionUpper.startsWith('TASK_OVERDUE')) {
    line1 = (
      <span className="text-red-600 font-bold">
        Task Overdue: 
        {taskId ? taskLinkElement(taskId, formattedTaskCode) : ''}
      </span>
    );
  } else if (actionUpper.startsWith('MEMBER_ADDED')) {
    const emailMatch = action.match(/member\s+([^\s]+)/i);
    const email = emailMatch ? emailMatch[1] : '';
    const roleMatch = action.match(/role\s+(.+)$/i);
    const role = roleMatch ? roleMatch[1] : '';
    line1 = (
      <span>
        Team Member Added: 
        {email && <span className="text-[#615d59] font-medium ml-1">{email}</span>}
        {role && <span className="text-[#a39e98] text-[11px] font-normal bg-[#f6f5f4] border border-[#e6e6e6] px-1.5 py-0.5 rounded ml-1.5">{role}</span>}
      </span>
    );
  } else if (actionUpper.startsWith('MEMBER_ROLE_UPDATED')) {
    const emailMatch = action.match(/updated\s+([^\s]+)/i);
    const email = emailMatch ? emailMatch[1] : '';
    const roleMatch = action.match(/role to\s+(.+)$/i);
    const role = roleMatch ? roleMatch[1] : '';
    line1 = (
      <span>
        Member Role Updated: 
        {email && <span className="text-[#615d59] font-medium ml-1">{email}</span>}
        {role && <span className="text-[#a39e98] text-[11px] font-normal bg-[#f6f5f4] border border-[#e6e6e6] px-1.5 py-0.5 rounded ml-1.5">{role}</span>}
      </span>
    );
  } else if (actionUpper.startsWith('MEMBER_REMOVED')) {
    const emailMatch = action.match(/member\s+(.+)$/i);
    const email = emailMatch ? emailMatch[1] : '';
    line1 = (
      <span>
        Member Removed: 
        {email && <span className="text-[#615d59] font-medium ml-1">{email}</span>}
      </span>
    );
  } else if (actionUpper.startsWith('REVIEW_APPROVED')) {
    const reviewerMatch = action.match(/by\s+(.+)$/i);
    const reviewer = reviewerMatch ? reviewerMatch[1] : '';
    line1 = (
      <span>
        Review Approved: 
        {taskId ? taskLinkElement(taskId, formattedTaskCode) : ''}
        {reviewer && <span className="text-[#615d59] font-medium ml-1">by {reviewer}</span>}
      </span>
    );
  } else if (actionUpper.startsWith('REVIEW_DECLINED') || actionUpper.startsWith('REVIEW_REJECTED')) {
    const reviewerMatch = action.match(/by\s+(.+)$/i);
    const reviewer = reviewerMatch ? reviewerMatch[1] : '';
    line1 = (
      <span>
        Review Declined: 
        {taskId ? taskLinkElement(taskId, formattedTaskCode) : ''}
        {reviewer && <span className="text-[#615d59] font-medium ml-1">by {reviewer}</span>}
      </span>
    );
  } else if (actionUpper.startsWith('PROJECT_ANNOUNCEMENT')) {
    const titleMatch = action.match(/announcement\s+"([^"]+)"/i);
    const title = titleMatch ? titleMatch[1] : '';
    line1 = (
      <span>
        Announcement: 
        {title && <span className="text-[#615d59] font-medium ml-1">&ldquo;{title}&rdquo;</span>}
      </span>
    );
  } else {
    if (taskId) {
      line1 = (
        <span>
          {action}: 
          {taskLinkElement(taskId, formattedTaskCode)}
        </span>
      );
    }
  }

  const relTime = getRelativeTime(timestamp);
  const line2Parts = [
    `By ${actor}`,
    project ? project : null,
    relTime
  ].filter(Boolean);

  const line2Text = line2Parts.join(' • ');

  if (minimal) {
    return (
      <div className="px-3 py-2.5 hover:bg-[#f6f5f4] transition-colors border-l-2 border-[#e6e6e6] hover:border-black flex flex-col gap-0.5">
        <div className="text-[12px] font-semibold text-black leading-normal flex flex-wrap items-center">
          {line1}
        </div>
        <div className="text-[10px] text-[#a39e98] font-medium">
          {line2Text}
        </div>
      </div>
    );
  }

  return (
    <div className="px-5 py-4 flex items-start gap-3 hover:bg-[#f6f5f4] transition-colors border-b border-[#e6e6e6] last:border-b-0">
      <div className="w-7 h-7 rounded-full bg-[#f6f5f4] border border-[#e6e6e6] flex items-center justify-center shrink-0 mt-0.5">
        <Activity size={13} className="text-[#615d59]" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-[600] text-[#000000] leading-normal flex flex-wrap items-center">
          {line1}
        </div>
        <div className="text-[11px] text-[#a39e98] mt-1 font-medium">
          {line2Text}
        </div>
      </div>
    </div>
  );
}
