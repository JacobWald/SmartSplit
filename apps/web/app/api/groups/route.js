//This is where you would create an API route for groups using supabaseServer for privileged actions
//Example from ChatGPT below:


// import { supabaseServer } from '../../../lib/supabaseServer'

// export async function POST(request) {
//   try {
//     const body = await request.json()
//     const { name, owner_id, base_currency } = body

//     const { data, error } = await supabaseServer
//       .from('groups')
//       .insert([{ name, owner_id, base_currency }])
//       .select()

//     if (error) throw error
//     return new Response(JSON.stringify(data[0]), { status: 201 })
//   } catch (err) {
//     return new Response(JSON.stringify({ error: err.message }), { status: 500 })
//   }
// }
