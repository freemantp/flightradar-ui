import {FlightRadarService} from '@/services/flightRadarService'
import {TerrestialPosition} from '@/model/backendModel'

type TerrPosArray = Array<TerrestialPosition>;

export class FlightDataServiceImp {

    private positionCache: Map<string,TerrPosArray> = new Map();

    private latestPosition: Map<string,TerrestialPosition> = new Map();


    constructor(private frService: FlightRadarService) {

    }

    public getFlightPositions(flightId: string): Promise<TerrPosArray> {

        this.frService.getPositions(flightId)
        .then()

        return Promise.resolve([]);
    }


}