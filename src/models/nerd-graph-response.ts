export interface NerdGraphResponse {
  data: Data;
}

export interface Data {
  actor: Actor;
}

export interface Actor {
  entitySearch: EntitySearch;
}

export interface EntitySearch {
  count:   number;
  results: Results;
}

export interface Results {
  entities: Entity[];
}

export interface Entity {
  guid: string;
  name: string;
}
