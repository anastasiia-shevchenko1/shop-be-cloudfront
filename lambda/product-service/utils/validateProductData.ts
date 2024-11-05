export function validateProductData(data: any): boolean {
  return (
    data &&
    typeof data?.title === 'string' &&
    data?.title.trim() !== '' &&
    +data.price > 0
  );
}
