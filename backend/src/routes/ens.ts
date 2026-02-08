import { Router } from 'express';
import { ENSService } from '../services/ENSService';
import { User } from '../models';
import type { ENSTextRecords } from '../types';

export const createENSRouter = (ensService: ENSService): Router => {
  const router = Router();

  // Resolve ENS name
  router.get('/resolve/:ensName', async (req, res) => {
    try {
      const { ensName } = req.params;
      const result = await ensService.resolveENS(ensName);
      
      if (!result) {
        return res.status(404).json({ error: 'ENS name not found' });
      }

      res.json({
        ensName,
        address: result.address,
        textRecords: result.textRecords,
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to resolve ENS' });
    }
  });

  // Get user by ENS
  router.get('/user/:ensName', async (req, res) => {
    try {
      const user = await User.findOne({ 
        ensName: req.params.ensName.toLowerCase() 
      }).select('-__v');

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json(user);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch user' });
    }
  });

  // Register/update user mapping (from frontend after setProfile, or manual)
  // When on-chain resolution fails, we still store so /link can find the user.
 router.post('/register', async (req, res) => {
  console.log('\n=== /register endpoint called ===');
  console.log('Timestamp:', new Date().toISOString());
  console.log('Request body:', JSON.stringify(req.body, null, 2));

  try {
    const { ensName, telegramUsername, ethAddress } = req.body;

    console.log('\n--- Step 1: Validate inputs ---');
    console.log('Raw ensName:', ensName);
    console.log('Raw telegramUsername:', telegramUsername);
    console.log('Raw ethAddress:', ethAddress);

    if (!ensName || !ethAddress) {
      console.log('❌ Validation failed: Missing required fields');
      console.log('ensName present:', !!ensName);
      console.log('ethAddress present:', !!ethAddress);
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const normalizedName = ensName.toLowerCase().trim();
    const normalizedAddress = String(ethAddress).toLowerCase().trim();

    console.log('\n--- Step 2: Normalize inputs ---');
    console.log('Normalized ENS:', normalizedName);
    console.log('Normalized address:', normalizedAddress);

    let ethAddressToStore = normalizedAddress;
    let textRecords: ENSTextRecords = {};

    console.log('\n--- Step 3: Resolve ENS ---');
    console.log('Calling ensService.resolveENS for:', normalizedName);

    const resolved = await ensService.resolveENS(ensName);
    console.log('ENS resolution result:', resolved ? 'SUCCESS' : 'FAILED');
    
    if (resolved) {
      console.log('Resolved address:', resolved.address);
      console.log('Resolved textRecords:', JSON.stringify(resolved.textRecords, null, 2));
      
      if (resolved.address.toLowerCase() !== normalizedAddress) {
        console.log('❌ Address mismatch!');
        console.log('Expected:', normalizedAddress);
        console.log('Got:', resolved.address.toLowerCase());
        return res.status(400).json({ error: 'ENS does not match provided address' });
      }
      
      ethAddressToStore = resolved.address;
      textRecords = resolved.textRecords || {};
      console.log('✅ Address verified, using resolved address');
    } else {
      console.log('⚠️ ENS resolution failed (name may not exist on current RPC)');
      console.log('Proceeding with provided address for offline registration');
    }

    console.log('\n--- Step 4: Process text records ---');
    const textRecordsToStore =
      textRecords && typeof textRecords === 'object'
        ? Object.fromEntries(
            Object.entries(textRecords).filter(([, v]) => v != null && v !== '')
          )
        : {};
    
    console.log('Text records to store:', JSON.stringify(textRecordsToStore, null, 2));

    console.log('\n--- Step 5: Build update object ---');
    const update: Record<string, unknown> = {
      ensName: normalizedName,
      ethAddress: ethAddressToStore,
      textRecords: textRecordsToStore,
    };
    
    if (telegramUsername != null && telegramUsername !== '') {
      update.telegramUsername = telegramUsername;
      console.log('Added telegramUsername to update');
    } else {
      console.log('No telegramUsername provided, skipping');
    }
    
    console.log('Final update object:', JSON.stringify(update, null, 2));

    console.log('\n--- Step 6: Database upsert ---');
    console.log('Query filter: { ensName:', normalizedName, '}');
    
    const user = await User.findOneAndUpdate(
      { ensName: normalizedName },
      { $set: update },
      { upsert: true, new: true }
    );

    console.log('✅ Database operation successful');
    console.log('User ID:', user._id);
    console.log('User createdAt:', user.createdAt);
    console.log('User updatedAt:', user.updatedAt);
    console.log('Is new user (created in this request):', user.createdAt.getTime() === user.updatedAt.getTime());

    console.log('\n=== /register completed successfully ===\n');

    res.json({ 
      success: true, 
      user: {
        id: user._id,
        ensName: user.ensName,
        ethAddress: user.ethAddress,
        telegramUsername: user.telegramUsername,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });

  } catch (error) {
    console.error('\n❌❌❌ /register ERROR ❌❌❌');
    console.error('Timestamp:', new Date().toISOString());
    console.error('Error type:', error instanceof Error ? error.constructor.name : typeof error);
    console.error('Error message:', error instanceof Error ? error.message : String(error));
    
    if (error instanceof Error && error.stack) {
      console.error('Stack trace:');
      console.error(error.stack);
    }

    console.error('Request body that caused error:', JSON.stringify(req.body, null, 2));
    console.error('=== /register failed ===\n');

    res.status(500).json({
      error: 'Failed to register user',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

  return router;
};