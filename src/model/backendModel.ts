export interface Flight {

    id: string;
    icao24: string;
    cls: string;
    lstCntct: Date
}

export interface TerrestialPosition {
    lat: number;
    lon: number;
    alt?: number;
}

export interface Aircraft {
    icao24: string
    type?: string;
    icaoType?: string;
    reg?: string;
    op?: string;
}