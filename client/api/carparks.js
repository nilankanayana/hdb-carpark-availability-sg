import { carparks, shapeCarparks, handleResource } from './_lib/upstream.js';

export default async function handler(_req, res) {
  await handleResource(carparks, shapeCarparks, res);
}
