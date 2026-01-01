'use client';

import React, { useState } from 'react';
import { GlowButton } from '@/components/ui';

interface CheckInModalProps {
  hasCheckedIn: boolean;
  onComplete: (xpEarned: number) => void;
  onClose: () => void;
}

type NfcStatus = 'idle' | 'scanning' | 'found' | 'success' | 'already-checked' | 'error';

export const CheckInModal = ({ hasCheckedIn, onComplete, onClose }: CheckInModalProps) => {
  const [nfcStatus, setNfcStatus] = useState<NfcStatus>('idle');
  const [checkInResult, setCheckInResult] = useState<{
    success: boolean;
    xpEarned: number;
    message: string;
  } | null>(null);

  const performCheckIn = async () => {
    if (hasCheckedIn) {
      setCheckInResult({ success: false, xpEarned: 0, message: 'Already checked in!' });
      setNfcStatus('already-checked');
      return;
    }

    setNfcStatus('scanning');

    // Simulate NFC scan delay
    setTimeout(async () => {
      setNfcStatus('found');
      
      // Actually call the API
      try {
        const response = await fetch('/api/xp/checkin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
          setCheckInResult({ 
            success: true, 
            xpEarned: data.xpAwarded || 20, 
            message: 'Welcome back!' 
          });
          setNfcStatus('success');
        } else if (data.alreadyCheckedIn) {
          setCheckInResult({ success: false, xpEarned: 0, message: 'Already checked in!' });
          setNfcStatus('already-checked');
        } else {
          setCheckInResult({ success: false, xpEarned: 0, message: data.error || 'Check-in failed' });
          setNfcStatus('error');
        }
      } catch (error) {
        console.error('Check-in error:', error);
        setCheckInResult({ success: false, xpEarned: 0, message: 'Network error' });
        setNfcStatus('error');
      }
    }, 1500);
  };

  const handleClose = () => {
    // If check-in was successful, trigger the onComplete callback
    if (nfcStatus === 'success' && checkInResult?.xpEarned) {
      onComplete(checkInResult.xpEarned);
    } else {
      onClose();
    }
    
    setNfcStatus('idle');
    setCheckInResult(null);
  };

  return (
    <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-3xl w-full max-w-sm overflow-hidden border border-cyan-500/30">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-cyan-600 p-6 text-center">
          <div className="text-2xl font-bold text-white">Check In</div>
          <p className="text-cyan-100/80 text-sm">Tap your card</p>
        </div>

        {/* Content */}
        <div className="p-8 text-center">
          {nfcStatus === 'idle' && (
            <>
              <div className="w-32 h-32 mx-auto mb-6 bg-slate-800 rounded-full flex items-center justify-center border-2 border-cyan-500/30 border-dashed">
                <span className="text-5xl">📍</span>
              </div>
              <GlowButton color="cyan" onClick={performCheckIn} className="w-full py-4 text-lg">
                Tap to Scan
              </GlowButton>
            </>
          )}

          {nfcStatus === 'scanning' && (
            <>
              <div className="w-32 h-32 mx-auto mb-6 bg-cyan-500/20 rounded-full flex items-center justify-center animate-pulse">
                <span className="text-5xl">📡</span>
              </div>
              <p className="text-cyan-400 font-semibold">Scanning...</p>
            </>
          )}

          {nfcStatus === 'found' && (
            <>
              <div className="w-32 h-32 mx-auto mb-6 bg-cyan-500/30 rounded-full flex items-center justify-center">
                <span className="text-5xl">✨</span>
              </div>
              <p className="text-cyan-400 font-semibold">Card Found!</p>
            </>
          )}

          {nfcStatus === 'already-checked' && (
            <>
              <div className="w-32 h-32 mx-auto mb-6 bg-yellow-500/20 rounded-full flex items-center justify-center">
                <span className="text-5xl">⏰</span>
              </div>
              <h3 className="text-2xl font-bold text-yellow-400 mb-2">Already Checked In!</h3>
              <p className="text-slate-400">Come back tomorrow</p>
            </>
          )}

          {nfcStatus === 'error' && (
            <>
              <div className="w-32 h-32 mx-auto mb-6 bg-red-500/20 rounded-full flex items-center justify-center">
                <span className="text-5xl">❌</span>
              </div>
              <h3 className="text-2xl font-bold text-red-400 mb-2">Check-in Failed</h3>
              <p className="text-slate-400">{checkInResult?.message || 'Please try again'}</p>
            </>
          )}

          {nfcStatus === 'success' && checkInResult && (
            <>
              <div className="w-32 h-32 mx-auto mb-6 bg-emerald-500/20 rounded-full flex items-center justify-center">
                <span className="text-5xl">✅</span>
              </div>
              <h3 className="text-2xl font-bold text-emerald-400 mb-2">{checkInResult.message}</h3>
              <div className="bg-cyan-500/20 rounded-xl p-4 inline-block border border-cyan-500/30">
                <span className="text-cyan-400 font-bold text-3xl">+{checkInResult.xpEarned}</span>
                <span className="text-cyan-400/70 ml-2">XP</span>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800">
          <button onClick={handleClose} className="w-full py-3 text-slate-500 font-medium">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
