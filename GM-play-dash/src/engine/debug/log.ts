export function debug(label: string, data?: unknown) {


  if (data !== undefined) {
    console.log(`[DEBUG] ${label}`, data);
  } else {
    console.log(`[DEBUG] ${label}`);
  }
}
