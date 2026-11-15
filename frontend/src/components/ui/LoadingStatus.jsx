export function LoadingSpinner() { return <span className="loading-spinner" aria-hidden="true"/>; }
export function LoadingDots() { return <span className="loading-dots" aria-hidden="true"><i/><i/><i/></span>; }
export default function LoadingStatus({message,detail,dots=false}) {
  return <div className="inline-loading" role="status" aria-live="polite">{dots?<LoadingDots/>:<LoadingSpinner/>}<div><strong>{message}</strong>{detail && <p>{detail}</p>}</div></div>;
}
