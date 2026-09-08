"use client";

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { FleetCommandCenter } from './FleetCommandCenter';
import { FleetBilling } from './FleetBilling';
import { FleetAnalytics } from './FleetAnalytics';

export function FleetManagement() {
  return (
    <Tabs defaultValue="command" className="w-full">
      <TabsList className="mb-4">
        <TabsTrigger value="command">Fleet Command</TabsTrigger>
        <TabsTrigger value="billing">Fleet Billing</TabsTrigger>
        <TabsTrigger value="analytics">Fleet Analytics</TabsTrigger>
      </TabsList>
      <TabsContent value="command">
        <FleetCommandCenter />
      </TabsContent>
      <TabsContent value="billing">
        <FleetBilling />
      </TabsContent>
      <TabsContent value="analytics">
        <FleetAnalytics />
      </TabsContent>
    </Tabs>
  );
}