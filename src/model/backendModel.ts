export interface Flight {

    id: number;
    cls: string;
    lstCntct: Date
}

export interface Aircraft {
    type: string;
    icaoType: string;
    reg: string;
    operator: string;
}