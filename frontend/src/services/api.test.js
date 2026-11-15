import { afterEach, expect, it, vi } from 'vitest';
import { askFarm, extractSoil } from './api';
afterEach(()=>{vi.unstubAllGlobals();vi.useRealTimers();});
it('bounds a pending question request and reports a retryable timeout',async()=>{
 vi.useFakeTimers();const fetcher=vi.fn((url,{signal})=>new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')))));
 vi.stubGlobal('fetch',fetcher);const result=askFarm({analysisId:'one'},'Question').catch(error=>error);
 await vi.advanceTimersByTimeAsync(45000);expect((await result).code).toBe('REQUEST_TIMEOUT');expect(fetcher).toHaveBeenCalledTimes(1);
});
it('uploads multipart report without overriding its boundary',async()=>{
 const fetcher=vi.fn(async()=>({ok:true,json:async()=>({ph:5.6})}));vi.stubGlobal('fetch',fetcher);
 await extractSoil(new Blob(['%PDF-1.4'],{type:'application/pdf'}));const options=fetcher.mock.calls[0][1];expect(options.body.get('report')).toBeTruthy();expect(options.headers).toBeUndefined();
});
