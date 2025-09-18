import React from 'react';
import { Widget } from '@skip-go/widget';

const TestWidgetPage: React.FC = () => {
  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">SkipGo Widget Test</h1>
      
      <div 
        className="w-full rounded-lg p-4" 
        style={{ 
          background: '#1a1a1a', 
          border: '1px solid #333',
          width: '100%',
          maxWidth: '500px',
          margin: '0 auto'
        }}
      >
        {/* @ts-ignore */}
        <Widget 
          theme="dark" 
          brandColor="#FF4FFF"
          cumulative_affiliate_fee_bps="75"
          chainIdsToAffiliates={{
            'neutron-1': {
              affiliates: [{
                address: 'neutron13lkew03teg5sukpgy5lj6z27x9nqylcxka0hpl'
              }]
            },
            'osmosis-1': {
              affiliates: [{
                address: 'osmo13lkew03teg5sukpgy5lj6z27x9nqylcx6e49d2'
              }]
            },
            'cosmoshub-4': {
              affiliates: [{
                address: 'cosmos13lkew03teg5sukpgy5lj6z27x9nqylcxjzx4mc'
              }]
            }
          }}
        />
      </div>
    </div>
  );
};

export default TestWidgetPage;
