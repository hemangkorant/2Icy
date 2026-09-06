-- Enable Supabase Realtime (Postgres change feeds) on every table the UI
-- subscribes to for live shared editing between trip members.
alter publication supabase_realtime add table
  public.trips,
  public.trip_members,
  public.itinerary_days,
  public.itinerary_stops,
  public.driving_segments,
  public.accommodations,
  public.flights,
  public.rental_cars,
  public.vehicle_checklists,
  public.fuel_entries,
  public.suggested_fuel_stops,
  public.activities,
  public.safety_checks,
  public.expenses,
  public.expense_splits,
  public.documents,
  public.packing_items,
  public.tasks,
  public.emergency_contacts,
  public.app_settings;
