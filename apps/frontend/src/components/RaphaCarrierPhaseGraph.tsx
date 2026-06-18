import React from 'react';
import RaphaPllGraph from './RaphaPllGraph';

export default function RaphaCarrierPhaseGraph({
  decoderId,
}: {
  decoderId?: string | null;
} = {}) {
  return <RaphaPllGraph decoderId={decoderId} series="carrierPhase" />;
}
