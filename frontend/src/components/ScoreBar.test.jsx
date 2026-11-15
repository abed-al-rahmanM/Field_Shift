import { expect,it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import ScoreBar from './ScoreBar';
it('explains missing water without showing an empty score bar',()=>{
 const html=renderToStaticMarkup(<ScoreBar label="Water" value={null}/>);
 expect(html).toContain('Not scored');expect(html).toContain('Crop water-demand data are incomplete.');expect(html).not.toContain('score-track');
});
it('retains a real zero as a numerical score',()=>{
 const html=renderToStaticMarkup(<ScoreBar label="Water" value={0}/>);
 expect(html).toContain('0/100');expect(html).toContain('score-track');expect(html).not.toContain('Not scored');
});
