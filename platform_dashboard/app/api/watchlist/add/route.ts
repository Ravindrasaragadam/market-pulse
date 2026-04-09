import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { symbol, priority = 5, notes = '' } = await request.json();

    if (!symbol) {
      return NextResponse.json(
        { error: 'Stock symbol is required' },
        { status: 400 }
      );
    }

    // Check if stock exists
    const { data: stockData, error: stockError } = await supabase
      .from('stock_symbols')
      .select('symbol, name')
      .eq('symbol', symbol)
      .single();

    if (stockError || !stockData) {
      return NextResponse.json(
        { error: 'Stock not found' },
        { status: 404 }
      );
    }

    // Add to watchlist
    const { data, error } = await supabase
      .from('user_watchlist')
      .upsert({
        stock_symbol: symbol,
        priority,
        notes,
        is_active: true,
        added_at: new Date().toISOString()
      }, {
        onConflict: 'stock_symbol',
        ignoreDuplicates: false
      })
      .select();

    if (error) {
      console.error('Watchlist add error:', error);
      return NextResponse.json(
        { error: 'Failed to add to watchlist' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `${stockData.name} added to watchlist`,
      data
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
