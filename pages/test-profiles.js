import React, { useState, useEffect } from 'react';
import {
  searchProfiles,
  getProfileByAddress,
  getProfilesByAddresses,
  formatProfile,
  getDisplayName,
  getDisplayImage,
  isValidAddress
} from '../lib/profiles';
import ProfileSelector from '../components/ProfileSelector';
import ProfileDisplay from '../components/ProfileDisplay';

export default function TestProfilesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [testAddresses] = useState([
    '0x1234567890123456789012345678901234567890',
    '0x0987654321098765432109876543210987654321',
    '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd'
  ]);
  const [batchProfiles, setBatchProfiles] = useState({});

  // Test individual search
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      let results;
      if (isValidAddress(searchQuery)) {
        console.log('Searching by address:', searchQuery);
        const profile = await getProfileByAddress(searchQuery);
        results = profile ? [profile] : [];
      } else {
        console.log('Searching by name:', searchQuery);
        results = await searchProfiles({ name: searchQuery });
      }

      setSearchResults(results || []);
      console.log('Search results:', results);
    } catch (err) {
      setError(`Search failed: ${err.message}`);
      console.error('Search error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Test batch profile loading
  const handleBatchTest = async () => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('Testing batch profile loading for addresses:', testAddresses);
      const profiles = await getProfilesByAddresses(testAddresses);
      setBatchProfiles(profiles);
      console.log('Batch results:', profiles);
    } catch (err) {
      setError(`Batch test failed: ${err.message}`);
      console.error('Batch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Clear all results
  const handleClear = () => {
    setSearchQuery('');
    setSearchResults([]);
    setSelectedProfile(null);
    setBatchProfiles({});
    setError(null);
  };

  return (
    <div style={{ maxWidth: '800px', margin: '20px auto', padding: '20px' }}>
      <h1 style={{ color: '#333', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
        Circles Profile Service Test
      </h1>

      <p style={{ color: '#666', marginBottom: '30px' }}>
        Test the integration with the Circles Profile Service API. This page allows you to
        test profile searching, selection, and display components.
      </p>

      {/* Error Display */}
      {error && (
        <div style={{
          padding: '15px',
          backgroundColor: '#ffe6e6',
          border: '1px solid #f44336',
          borderRadius: '5px',
          color: '#f44336',
          marginBottom: '20px'
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Loading Indicator */}
      {isLoading && (
        <div style={{
          padding: '15px',
          backgroundColor: '#e3f2fd',
          border: '1px solid #2196F3',
          borderRadius: '5px',
          color: '#2196F3',
          marginBottom: '20px',
          textAlign: 'center'
        }}>
          Loading...
        </div>
      )}

      {/* Test 1: Profile Selector Component */}
      <section style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '20px', color: '#555', marginBottom: '15px' }}>
          Test 1: Profile Selector Component
        </h2>
        <p style={{ fontSize: '14px', color: '#666', marginBottom: '15px' }}>
          This tests the ProfileSelector component used in the mint-open app.
        </p>
        <ProfileSelector
          selectedProfile={selectedProfile}
          onProfileSelect={setSelectedProfile}
        />
        {selectedProfile && (
          <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#f0f8f0', borderRadius: '5px' }}>
            <strong>Selected Profile Data:</strong>
            <pre style={{ fontSize: '12px', marginTop: '8px' }}>
              {JSON.stringify(selectedProfile, null, 2)}
            </pre>
          </div>
        )}
      </section>

      {/* Test 2: Manual Search */}
      <section style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '20px', color: '#555', marginBottom: '15px' }}>
          Test 2: Manual Search
        </h2>
        <p style={{ fontSize: '14px', color: '#666', marginBottom: '15px' }}>
          Test direct API calls to the Circles Profile Service.
        </p>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Enter name or address (0x...)"
            style={{
              flex: 1,
              padding: '10px',
              fontSize: '14px',
              border: '1px solid #ddd',
              borderRadius: '3px'
            }}
          />
          <button
            onClick={handleSearch}
            disabled={isLoading}
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              backgroundColor: '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer'
            }}
          >
            Search
          </button>
        </div>

        {searchResults.length > 0 && (
          <div>
            <h3 style={{ fontSize: '16px', marginBottom: '10px' }}>Results:</h3>
            {searchResults.map((profile, index) => (
              <div key={index} style={{
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '3px',
                marginBottom: '10px',
                backgroundColor: '#fafafa'
              }}>
                <ProfileDisplay
                  address={profile.address}
                  profile={profile}
                  showAddress={true}
                  showDescription={true}
                  imageSize={40}
                />
                <details style={{ marginTop: '8px' }}>
                  <summary style={{ fontSize: '12px', color: '#666', cursor: 'pointer' }}>
                    Raw Data
                  </summary>
                  <pre style={{ fontSize: '11px', marginTop: '5px', overflow: 'auto' }}>
                    {JSON.stringify(profile, null, 2)}
                  </pre>
                </details>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Test 3: Batch Profile Loading */}
      <section style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '20px', color: '#555', marginBottom: '15px' }}>
          Test 3: Batch Profile Loading
        </h2>
        <p style={{ fontSize: '14px', color: '#666', marginBottom: '15px' }}>
          Test loading profiles for multiple addresses at once (like in the social feed).
        </p>
        <button
          onClick={handleBatchTest}
          disabled={isLoading}
          style={{
            padding: '10px 20px',
            fontSize: '14px',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '3px',
            cursor: 'pointer',
            marginBottom: '15px'
          }}
        >
          Test Batch Loading
        </button>

        <div>
          <h3 style={{ fontSize: '16px', marginBottom: '10px' }}>Test Addresses:</h3>
          {testAddresses.map((address, index) => {
            const profile = batchProfiles[address];
            return (
              <div key={index} style={{
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '3px',
                marginBottom: '10px',
                backgroundColor: profile ? '#f0f8f0' : '#fff8f0'
              }}>
                <ProfileDisplay
                  address={address}
                  profile={profile}
                  showAddress={true}
                  showDescription={true}
                  imageSize={32}
                />
                <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                  Status: {profile ? '✅ Profile found' : '❌ No profile'}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Test 4: Utility Functions */}
      <section style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '20px', color: '#555', marginBottom: '15px' }}>
          Test 4: Utility Functions
        </h2>
        <p style={{ fontSize: '14px', color: '#666', marginBottom: '15px' }}>
          Test utility functions for display names and images.
        </p>
        <div style={{ display: 'grid', gap: '10px' }}>
          {testAddresses.map((address, index) => {
            const profile = batchProfiles[address];
            const displayName = getDisplayName(address, batchProfiles);
            const displayImage = getDisplayImage(address, batchProfiles);

            return (
              <div key={index} style={{
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '3px',
                backgroundColor: '#fafafa'
              }}>
                <div style={{ fontSize: '12px', fontFamily: 'monospace' }}>
                  Address: {address}
                </div>
                <div style={{ fontSize: '14px', marginTop: '5px' }}>
                  Display Name: <strong>{displayName}</strong>
                </div>
                <div style={{ fontSize: '14px', marginTop: '5px' }}>
                  Has Image: {displayImage ? '✅ Yes' : '❌ No'}
                </div>
                <div style={{ fontSize: '14px', marginTop: '5px' }}>
                  Valid Address: {isValidAddress(address) ? '✅ Yes' : '❌ No'}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Controls */}
      <section>
        <button
          onClick={handleClear}
          style={{
            padding: '10px 20px',
            fontSize: '14px',
            backgroundColor: '#f44336',
            color: 'white',
            border: 'none',
            borderRadius: '3px',
            cursor: 'pointer'
          }}
        >
          Clear All Results
        </button>
      </section>

      {/* API Information */}
      <section style={{ marginTop: '40px', padding: '20px', backgroundColor: '#f5f5f5', borderRadius: '5px' }}>
        <h2 style={{ fontSize: '18px', color: '#333', marginBottom: '15px' }}>
          API Information
        </h2>
        <div style={{ fontSize: '14px', color: '#666' }}>
          <p><strong>Base URL:</strong> https://rpc.aboutcircles.com/profiles</p>
          <p><strong>Available Endpoints:</strong></p>
          <ul>
            <li>GET /search?name=... - Search by name</li>
            <li>GET /search?address=... - Search by address</li>
            <li>GET /get?cid=... - Get by CID</li>
            <li>GET /getBatch?cids=... - Get multiple by CIDs</li>
            <li>POST /pin - Create new profile</li>
          </ul>
          <p style={{ marginTop: '15px' }}>
            <em>This test page exercises the profile integration used in the mint-open and social-feed apps.</em>
          </p>
        </div>
      </section>
    </div>
  );
}
