export interface Flight {

    id: number;
    cls: string;
    lstCntct: Date
}

export interface Aircraft {
    icao24: string
    type?: string;
    icaoType?: string;
    reg?: string;
    op?: string;
}