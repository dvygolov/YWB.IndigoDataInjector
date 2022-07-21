let otpButton = document.getElementById('get-otp');
otpButton.onclick = function(){
  let secret = document.getElementById('otpsecret');
  var totp = new jsOTP.totp();
  var timeCode = totp.getOtp(secret.value);
  let result = document.getElementById('otp');
  result.value = timeCode;
}
