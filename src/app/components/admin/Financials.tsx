"use client";

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { PendingVerificationsManager } from './PendingVerificationsManager';
import { POSView } from './POSView';

export function Financials() {
  return (
    <Tabs defaultValue="verifications" className="w-full">
      <TabsList className="mb-4">
        <TabsTrigger value="verifications">Pending Verifications</TabsTrigger>
        <TabsTrigger value="invoices">Pending Invoices</TabsTrigger>
      </TabsList>
      <TabsContent value="verifications">
        <PendingVerificationsManager />
      </TabsContent>
      <TabsContent value="invoices">
        <POSView mode="pending-invoices" />
      </TabsContent>
    </Tabs>
  );
}