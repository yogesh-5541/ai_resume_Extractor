$lines = Get-Content 'c:\Users\lapzy\Downloads\Proejct\backend\run_out.txt'
$lines[33..60] | Out-File 'c:\Users\lapzy\Downloads\Proejct\backend\chunk1.txt' -Encoding utf8
$lines[61..101] | Out-File 'c:\Users\lapzy\Downloads\Proejct\backend\chunk2.txt' -Encoding utf8
