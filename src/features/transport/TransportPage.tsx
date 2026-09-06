import { PageHeader } from '@/components/common/page-header'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

import { FlightsSection } from './FlightsSection'
import { FuelSection, SuggestedFuelStops } from './FuelSection'
import { RentalCarSection } from './RentalCarSection'

export function TransportPage() {
  return (
    <div>
      <PageHeader title="Transport" description="Flights, rental car, and fuel tracking." />
      <Tabs defaultValue="flights">
        <TabsList>
          <TabsTrigger value="flights">Flights</TabsTrigger>
          <TabsTrigger value="car">Rental car</TabsTrigger>
          <TabsTrigger value="fuel">Fuel</TabsTrigger>
        </TabsList>
        <TabsContent value="flights">
          <FlightsSection />
        </TabsContent>
        <TabsContent value="car">
          <RentalCarSection />
        </TabsContent>
        <TabsContent value="fuel" className="space-y-4">
          <FuelSection />
          <SuggestedFuelStops />
        </TabsContent>
      </Tabs>
    </div>
  )
}
