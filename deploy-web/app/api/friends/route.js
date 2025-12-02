import { NextResponse } from 'next/server'
import { supabaseServer } from '../../../lib/supabaseServer'

export async function GET(req) {
    const { searchParams } = new URL(req.url)
    const friendId = searchParams.get('friendId')

    if (!friendId) {
        return NextResponse.json({ error: 'Missing friendId' }, { status: 400 })
    }

    const { data: friendData, error: friendError } = await supabaseServer
        .from('user_friends')
        .select('user_id')
        .eq('friend_id', friendId)

    if (friendError) return NextResponse.json({ error: friendError.message }, { status: 500 })

    const userIds = friendData.map(f => f.user_id)

    if (userIds.length === 0) {
        return NextResponse.json([], { status: 200 })
    }

    const { data: profiles, error: profileError } = await supabaseServer
        .from('profiles')
        .select('id, username, full_name')
        .in('id', userIds)
    
    if (profileError) {
        return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    // Return the profiles of friends 
    return NextResponse.json(profiles, { status: 200 })
}
