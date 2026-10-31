export async function GET() {
  return Response.json({ error: "Endpoint ini tidak tersedia." }, { status: 404 });
}
