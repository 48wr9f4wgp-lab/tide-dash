from pathlib import Path
import hashlib, subprocess
base = subprocess.check_output(['git','show','7dc68393c0036ae626391ed299eb88d29c3e4725:app-candidate.js'])
assert hashlib.sha256(base).hexdigest() == '16307c7f3a9ba935937e98bd4275c2db315491531bc5beff92405b2ffcec9930'
addition = Path('scripts/field-ui-dev6.js').read_bytes()
assert hashlib.sha256(addition).hexdigest() == '034c468f8c9ad31563dce2cc66f92b7f89d68f4b3854313b5ee3fcc2d4fb1990'
s = base.decode('utf-8').replace('const APP_VERSION="0.20.0-dev.5";','const APP_VERSION="0.20.0-dev.6";',1)
s = s.replace('function widget(t,wp,S,badge,badgeColor,err=null,distanceKm=null,locationState="current",tideRef=null){','function compactWidget(t,wp,S,badge,badgeColor,err=null,distanceKm=null,locationState="current",tideRef=null){',1)
i = s.index('async function buildCurrent(')
s = s[:i] + addition.decode('utf-8') + s[i:]
b = s.encode('utf-8')
assert len(b) == 74443
assert hashlib.sha256(b).hexdigest() == '187d7bb812cad87dbaed1178dfd104e385a6d7c8e158abf90e6d393ae7872032'
assert hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest() == '8cb25f27efe6650bccdf687317f28c4593386408'
Path('app-candidate.js').write_bytes(b)
print('Exact tested artifact verified:', hashlib.sha256(b).hexdigest())
