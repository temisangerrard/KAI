import { NextRequest, NextResponse } from 'next/server';
import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc, query, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/db/database';
import { TokenPackage } from '@/lib/types/token';

// TODO: Add admin authentication middleware
async function verifyAdminAuth(request: NextRequest) {
  // Placeholder for admin authentication
  return true;
}

export async function GET(request: NextRequest) {
  try {
    const isAdmin = await verifyAdminAuth(request);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const packagesSnapshot = await getDocs(
      query(collection(db, 'token_packages'), orderBy('sortOrder', 'asc'))
    );

    const packages = packagesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return NextResponse.json({ packages });
  } catch (error) {
    console.error('Error fetching token packages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch token packages' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const isAdmin = await verifyAdminAuth(request);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, tokens, priceUSD, bonusTokens, sortOrder } = body;

    // Validate required fields
    if (!name || !tokens || !priceUSD || sortOrder === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: name, tokens, priceUSD, sortOrder' },
        { status: 400 }
      );
    }

    // Create new token package
    const newPackage: Omit<TokenPackage, 'id'> = {
      name,
      tokens: Number(tokens),
      priceUSD: Number(priceUSD),
      bonusTokens: Number(bonusTokens) || 0,
      stripePriceId: '', // TODO: Create Stripe price when Stripe is integrated
      isActive: true,
      sortOrder: Number(sortOrder),
      createdAt: Timestamp.now()
    };

    const docRef = await addDoc(collection(db, 'token_packages'), newPackage);

    return NextResponse.json({
      id: docRef.id,
      ...newPackage,
      message: 'Token package created successfully'
    });
  } catch (error) {
    console.error('Error creating token package:', error);
    return NextResponse.json(
      { error: 'Failed to create token package' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const isAdmin = await verifyAdminAuth(request);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, name, tokens, priceUSD, bonusTokens, isActive, sortOrder } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Package ID is required for updates' },
        { status: 400 }
      );
    }

    const updateData: Partial<TokenPackage> = {};
    if (name !== undefined) updateData.name = name;
    if (tokens !== undefined) updateData.tokens = Number(tokens);
    if (priceUSD !== undefined) updateData.priceUSD = Number(priceUSD);
    if (bonusTokens !== undefined) updateData.bonusTokens = Number(bonusTokens);
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);
    if (sortOrder !== undefined) updateData.sortOrder = Number(sortOrder);

    await updateDoc(doc(db, 'token_packages', id), updateData);

    return NextResponse.json({
      id,
      ...updateData,
      message: 'Token package updated successfully'
    });
  } catch (error) {
    console.error('Error updating token package:', error);
    return NextResponse.json(
      { error: 'Failed to update token package' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const isAdmin = await verifyAdminAuth(request);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Package ID is required' },
        { status: 400 }
      );
    }

    await deleteDoc(doc(db, 'token_packages', id));

    return NextResponse.json({
      message: 'Token package deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting token package:', error);
    return NextResponse.json(
      { error: 'Failed to delete token package' },
      { status: 500 }
    );
  }
}