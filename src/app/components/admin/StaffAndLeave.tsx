"use client";

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { EmployeesManager } from './EmployeesManager';
import { PendingTimeOffManager } from './PendingTimeOffManager';

export function StaffAndLeave() {
  return (
    <Tabs defaultValue="staff" className="w-full">
      <TabsList className="mb-4">
        <TabsTrigger value="staff">Staff Management</TabsTrigger>
        <TabsTrigger value="leave">Leave Requests</TabsTrigger>
      </TabsList>
      <TabsContent value="staff">
        <EmployeesManager />
      </TabsContent>
      <TabsContent value="leave">
        <PendingTimeOffManager />
      </TabsContent>
    </Tabs>
  );
}