export interface ClientProperty {
  id?: string;
  farmName: string;
  city: string;
  state: string;
  routeNotes: string;
  phone: string;
  ie: string;
  nirf: string;
  sortOrder?: number;
}

export interface ClientIntentionRef {
  id: string;
  code: string;
  label: string;
}

export interface ClientPrimaryProperty {
  id: string;
  farmName: string;
  city: string;
  state: string;
  phone: string | null;
}

/** Resposta leve de GET /clients (listagem e preview de exportação). */
export interface ClientListItem {
  id: string;
  name: string;
  document: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  animalType: string | null;
  animalSex: string | null;
  livestockCategory: string | null;
  active: boolean;
  isDefault: boolean;
  isComplete: boolean;
  documentCount: number;
  propertyCount: number;
  primaryProperty: ClientPrimaryProperty | null;
  createdAt: string;
  updatedAt: string;
}

export interface Client {
  id: string;
  name: string;
  document: string | null;
  email: string | null;
  phone: string | null;
  addressFull: string | null;
  notes: string | null;
  animalType: string | null;
  animalSex: string | null;
  livestockCategory: string | null;
  intentionNotes: string | null;
  intentions: ClientIntentionRef[];
  active: boolean;
  isDefault: boolean;
  responsibleId: string | null;
  responsible: { id: string; name: string } | null;
  properties: ClientProperty[];
  isComplete: boolean;
  documentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CollaboratorOption {
  id: string;
  name: string;
  active: boolean;
}

export interface ClientFormTokenItem {
  id: string;
  type: 'create' | 'edit';
  clientId: string | null;
  expiresAt: string;
  usedAt: string | null;
  submittedAt: string | null;
  createdAt: string;
}

export interface PublicFormPayload {
  type: 'create' | 'edit';
  tenantName: string;
  client: {
    name: string;
    document: string;
    email: string;
    phone: string;
    addressFull: string;
  } | null;
  properties: ClientProperty[];
}

export const emptyProperty = (): ClientProperty => ({
  farmName: '',
  city: '',
  state: '',
  routeNotes: '',
  phone: '',
  ie: '',
  nirf: '',
});
