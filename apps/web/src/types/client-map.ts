export interface ClientMapPoint {
  id: string;
  name: string;
  lat: number;
  lng: number;
  approx: boolean;
  source: 'city' | 'ddd';
  label: string;
}
