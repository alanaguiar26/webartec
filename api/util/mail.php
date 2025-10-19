<?php
function send_html_mail(string $to, string $subject, string $html): bool {
  $headers  = "MIME-Version: 1.0\r\n";
  $headers .= "Content-type: text/html; charset=UTF-8\r\n";
  $headers .= "From: Webartec <no-reply@webartec.local>\r\n";
  return mail($to, $subject, $html, $headers);
}
