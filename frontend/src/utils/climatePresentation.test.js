import { expect, it } from 'vitest';
import { temperatureChartData, climateLabel } from './climatePresentation';
import { validLocation } from './location';
it('maps exact daily Celsius values, sorted dates and gaps without smoothing',()=>{
 expect(temperatureChartData({daily:[{date:'2026-03-03',temperatureC:0},{date:'2026-03-01',temperatureC:-12.4},{date:'2026-03-02',temperatureC:null}]})).toEqual([{date:'2026-03-01',temperature:-12.4},{date:'2026-03-02',temperature:null},{date:'2026-03-03',temperature:0}]);
});
it('distinguishes baseline, cache, incomplete and synthetic periods',()=>{
 const climate={period:{start:'2026-03-01',end:'2026-05-31'},periodType:'historical_baseline',dataStatus:'cached_nasa'};
 expect(climateLabel(climate,'live')).toContain('one season');expect(climateLabel(climate,'live')).toContain('cached');expect(climateLabel(climate,'live')).toContain('2026-05-31');
 expect(climateLabel({...climate,periodType:'ongoing_observations'},'live')).toContain('incomplete');expect(climateLabel(climate,'demo')).toContain('Demo');
});
it('requires finite numeric coordinates in world bounds',()=>{
 for(const location of [null,{latitude:null,longitude:0},{latitude:91,longitude:1},{latitude:0,longitude:Infinity},{latitude:'34',longitude:36}])expect(validLocation(location)).toBe(false);
 expect(validLocation({latitude:34.123456789,longitude:-180})).toBe(true);
});
