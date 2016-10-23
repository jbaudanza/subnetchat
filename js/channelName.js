import ip from 'ip-address';

export default function channelName(addressString) {
  let addr;

  function chomp(addr, delim) {
    return addr.parsedAddress
      .slice(0, addr.parsedAddress.length - 1)
      .join(delim) + delim + '*';
  }

  addr = new ip.Address6(addressString);
  if (addr.valid) {
    return chomp(addr, ':');
  }

  addr = new ip.Address4(addressString);
  if (addr.valid) {
    return chomp(addr, '.');
  }
}
