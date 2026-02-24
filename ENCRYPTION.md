# API Key Encryption

This application implements **AES-256-GCM encryption** for Claude API keys stored in the database to protect sensitive user data.

## How It Works

### Encryption Algorithm
- **Algorithm**: AES-256-GCM (Galois/Counter Mode)
- **Key Size**: 256 bits
- **Authentication**: Built-in authentication tag prevents tampering
- **IV**: Random initialization vector for each encryption

### Storage Format
Encrypted values are stored as base64-encoded strings containing:
```
base64(IV : salt : authTag : encryptedData)
```

### Key Derivation
The encryption key is derived from `ENCRYPTION_KEY` environment variable using:
- **Function**: scrypt
- **Output**: 256-bit key
- **Salt**: Application-specific fixed salt

## Setup

### 1. Generate Encryption Key

Generate a secure 32-byte random key:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2. Add to Environment

Add to your `.env` file:
```env
ENCRYPTION_KEY=your-generated-key-here
```

**CRITICAL**:
- ⚠️ Never commit the actual key to version control
- ⚠️ Use different keys for different environments (dev/staging/prod)
- ⚠️ Store production keys securely (e.g., in your hosting platform's secrets manager)

### 3. Migrate Existing Data

If you have existing API keys in plain text, run the migration:
```bash
npm run db:migrate-encrypt
```

This will:
- Find all plain-text API keys
- Encrypt them using your encryption key
- Update the database
- Skip already-encrypted keys

## Security Features

✅ **Industry Standard**: AES-256-GCM is NIST-approved and widely used
✅ **Authentication**: GCM mode includes authentication tag preventing tampering
✅ **Unique IVs**: Each encryption uses a random IV for security
✅ **Backward Compatible**: Auto-detects and handles both encrypted and plain-text values
✅ **Transparent**: Application code seamlessly encrypts/decrypts

## Key Rotation

To rotate your encryption key:

1. **Generate new key**:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. **Decrypt all keys with old key** (save to temporary location)

3. **Update `ENCRYPTION_KEY`** in environment

4. **Re-encrypt all keys with new key**

**Note**: There's no automated rotation script yet. Implement carefully in production.

## Production Deployment

### Vercel
Add `ENCRYPTION_KEY` to Environment Variables in Project Settings:
```
ENCRYPTION_KEY=your-production-key-here
```

### Other Platforms
- **AWS**: Use AWS Secrets Manager or Parameter Store
- **Heroku**: Use `heroku config:set ENCRYPTION_KEY=xxx`
- **Docker**: Pass as environment variable or use secrets

## Troubleshooting

### "ENCRYPTION_KEY environment variable is not set"
- Ensure `.env` file has `ENCRYPTION_KEY` defined
- Restart your dev server after adding the key

### "Failed to decrypt data"
- The encryption key has changed
- Data was corrupted
- Run migration to re-encrypt with current key

### Database shows encrypted gibberish
- This is **expected and correct**
- API keys should look like: `Ab3dF9k2...` (base64 encoded)
- Never store them in plain text

## Code Usage

The encryption is handled automatically in the settings API. You don't need to call encryption functions directly.

```typescript
// Encryption happens automatically
await settingsAPI.update({ claudeApiKey: 'sk-ant-...' });

// Decryption happens automatically
const settings = await settingsAPI.get();
console.log(settings.claudeApiKey); // Plain text for use
```

## Security Considerations

1. **Encryption Key Storage**
   - Never commit to Git
   - Use secrets manager in production
   - Rotate periodically

2. **Database Backups**
   - Encrypted API keys are safe in backups
   - But encryption key must be secured separately

3. **Access Control**
   - Limit who can access environment variables
   - Restrict database access
   - Log key access attempts

4. **Transport Security**
   - Always use HTTPS
   - API keys transmitted over TLS
   - Database connections use SSL

## Files

- `src/utils/encryption.ts` - Encryption/decryption functions
- `src/pages/api/settings.ts` - Settings API with encryption
- `scripts/migrate-encrypt-api-keys.ts` - Migration script
- `.env.example` - Template with all required variables

## Resources

- [NIST AES-GCM Documentation](https://csrc.nist.gov/publications/detail/sp/800-38d/final)
- [Node.js Crypto Module](https://nodejs.org/api/crypto.html)
- [OWASP Key Management](https://cheatsheetseries.owasp.org/cheatsheets/Key_Management_Cheat_Sheet.html)
