export const mockAppointments = [
  {
    id: '1',
    service: 'Premium Car Wash',
    date: 'Feb 15, 2026',
    time: '10:00 AM',
    location: '123 Kenyatta Ave, Nairobi',
    vehicle: 'Toyota Camry 2022',
    status: 'awaiting-confirmation' as const,
    concierge: 'Kwame Asante'
  },
  {
    id: '2',
    service: 'Oil Change',
    date: 'Feb 18, 2026',
    time: '2:00 PM',
    location: '456 Moi Ave, Westlands',
    vehicle: 'Honda Accord 2021',
    status: 'pending' as const
  },
  {
    id: '3',
    service: 'Full Detailing',
    date: 'Feb 10, 2026',
    time: '8:00 AM',
    location: '789 Uhuru Hwy, Kilimani',
    vehicle: 'BMW 3 Series 2023',
    status: 'completed' as const,
    concierge: 'Ngozi Adeyemi',
    confirmed: true
  }
];