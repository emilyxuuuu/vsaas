export interface Camera {
  id: string;
  name: string;
  floorId: string;
  siteId: string;
}

export interface Floor {
  id: string;
  name: string;
  siteId: string;
}

export interface Site {
  id: string;
  name: string;
  address: string;
}

export const MOCK_SITES: Site[] = [
  { id: 'site-a', name: 'Downtown HQ',      address: '100 Market St'     },
  { id: 'site-b', name: 'Westside Branch',  address: '450 West Ave'      },
  { id: 'site-c', name: 'North Campus',     address: '1200 University Blvd' },
  { id: 'site-d', name: 'Airport Terminal', address: 'Terminal 2, Gate C' },
  { id: 'site-e', name: 'Harbor Warehouse', address: '88 Pier Road'       },
];

export const MOCK_FLOORS: Floor[] = [
  { id: 'floor-a1', name: 'Lobby & Entrance', siteId: 'site-a' },
  { id: 'floor-a2', name: 'Exterior',         siteId: 'site-a' },
  { id: 'floor-a3', name: 'Interior',         siteId: 'site-a' },
  { id: 'floor-b1', name: 'Parking',          siteId: 'site-b' },
  { id: 'floor-b2', name: 'Exterior',         siteId: 'site-b' },
  { id: 'floor-c1', name: 'Main Building',    siteId: 'site-c' },
  { id: 'floor-c2', name: 'Perimeter',        siteId: 'site-c' },
  { id: 'floor-d1', name: 'Departures',       siteId: 'site-d' },
  { id: 'floor-d2', name: 'Arrivals',         siteId: 'site-d' },
  { id: 'floor-e1', name: 'Loading Dock',     siteId: 'site-e' },
];

// Maps existing mock event camera IDs (cam-1 … cam-10) into the site/floor hierarchy
// cam-11 onwards are additional cameras (no mock events, but appear in location picker)
export const MOCK_CAMERAS: Camera[] = [
  { id: 'cam-1',  name: 'Front Door',      floorId: 'floor-a1', siteId: 'site-a' },
  { id: 'cam-10', name: 'Lobby',           floorId: 'floor-a1', siteId: 'site-a' },
  { id: 'cam-2',  name: 'Driveway',        floorId: 'floor-a2', siteId: 'site-a' },
  { id: 'cam-4',  name: 'Garage',          floorId: 'floor-a2', siteId: 'site-a' },
  { id: 'cam-5',  name: 'Side Gate',       floorId: 'floor-a2', siteId: 'site-a' },
  { id: 'cam-6',  name: 'Living Room',     floorId: 'floor-a3', siteId: 'site-a' },
  { id: 'cam-7',  name: 'Kitchen',         floorId: 'floor-a3', siteId: 'site-a' },
  { id: 'cam-8',  name: 'Parking Lot A',   floorId: 'floor-b1', siteId: 'site-b' },
  { id: 'cam-9',  name: 'Parking Lot B',   floorId: 'floor-b1', siteId: 'site-b' },
  { id: 'cam-3',  name: 'Backyard',        floorId: 'floor-b2', siteId: 'site-b' },
  { id: 'cam-11', name: 'Main Entrance',   floorId: 'floor-c1', siteId: 'site-c' },
  { id: 'cam-12', name: 'Courtyard',       floorId: 'floor-c1', siteId: 'site-c' },
  { id: 'cam-13', name: 'North Fence',     floorId: 'floor-c2', siteId: 'site-c' },
  { id: 'cam-14', name: 'Security Lane',   floorId: 'floor-d1', siteId: 'site-d' },
  { id: 'cam-15', name: 'Baggage Claim',   floorId: 'floor-d2', siteId: 'site-d' },
  { id: 'cam-16', name: 'Dock A',          floorId: 'floor-e1', siteId: 'site-e' },
  { id: 'cam-17', name: 'Dock B',          floorId: 'floor-e1', siteId: 'site-e' },
];

export const getCamerasForSite  = (siteId: string)  => MOCK_CAMERAS.filter(c => c.siteId  === siteId);
export const getCamerasForFloor = (floorId: string) => MOCK_CAMERAS.filter(c => c.floorId === floorId);
export const getFloorsForSite   = (siteId: string)  => MOCK_FLOORS.filter(f => f.siteId   === siteId);
