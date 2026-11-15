export function errorHandler(error,_req,res,_next) {
  let code=error.code ?? 'REQUEST_FAILED', status=error.status ?? 500, message=error.expose || status<500 ? error.message : 'The service could not complete this request. Please try again.';
  if(error.code==='LIMIT_FILE_SIZE'){code='UPLOAD_TOO_LARGE';status=413;message='Choose a report smaller than 5 MB.';}
  else if(error.name==='MulterError'){code='UPLOAD_INVALID';status=400;message='Upload one PDF, JPG or PNG using the report field.';}
  // Log safe diagnostics only: SDK errors may contain request headers or report contents.
  if(status>=500) console.error(JSON.stringify({service:'api',code,status}));
  if(error.retryAfterSeconds) res.set('Retry-After',String(error.retryAfterSeconds));
  res.status(status).json({retryAfterSeconds:error.retryAfterSeconds,quotaScope:error.quotaScope,status:'error',success:false,code,message,error:message,retryable:Boolean(error.retryable),details:error.details});
}

