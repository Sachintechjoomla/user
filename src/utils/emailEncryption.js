'use strict'
const crypto = require('crypto')

/**
 * Configuration from Environment Variables
 * secretKey: Must be a 32-byte hex string (64 characters) for aes-256
 * fixedIV: Must be a 16-byte hex string (32 characters)
 */
const secretKey = Buffer.from(process.env.EMAIL_ID_ENCRYPTION_KEY, 'hex')
const fixedIV = Buffer.from(process.env.EMAIL_ID_ENCRYPTION_IV, 'hex')
const algorithm = process.env.EMAIL_ID_ENCRYPTION_ALGORITHM || 'aes-256-cbc'

/**
 * Encrypts a string to Hex format
 */
const encrypt = (plainText) => {
	if (!plainText || typeof plainText !== 'string') return plainText

	try {
		const cipher = crypto.createCipheriv(algorithm, secretKey, fixedIV)
		let encrypted = cipher.update(plainText, 'utf-8', 'hex')
		encrypted += cipher.final('hex')
		return encrypted
	} catch (err) {
		console.error('Encryption failed:', err.message)
		return plainText
	}
}

/**
 * Decrypts a Hex string back to UTF-8
 * Handles cases where the input is already plain text or corrupted
 */
const decrypt = (encryptedText) => {
	// 1. Basic Validation: If null, undefined, or not a string, return as is
	if (!encryptedText || typeof encryptedText !== 'string') {
		return encryptedText
	}

	// 2. Pre-check: AES-256-CBC hex strings are always multiples of 32 characters
	// and only contain valid Hex characters (0-9, a-f)
	const isHex = /^[0-9a-fA-F]+$/.test(encryptedText)
	const isValidLength = encryptedText.length % 32 === 0

	if (!isHex || !isValidLength) {
		// This is likely already plain text (like the "0635605044" in your logs)
		return encryptedText
	}

	try {
		const decipher = crypto.createDecipheriv(algorithm, secretKey, fixedIV)
		let decrypted = decipher.update(encryptedText, 'hex', 'utf-8')
		decrypted += decipher.final('utf-8')
		return decrypted
	} catch (err) {
		/* 3. Final Safety Net: 
           If it "looked" like hex but failed (e.g. wrong key or corrupted block),
           we catch the 'wrong final block length' error here.
        */
		if (err.code === 'ERR_OSSL_WRONG_FINAL_BLOCK_LENGTH') {
			return encryptedText
		}

		console.error('Decryption Error:', err.message)
		return encryptedText
	}
}

/**
 * Phone is stored encrypted only when phone_code is set. Legacy rows store plaintext with empty phone_code.
 */
const decryptPhone = (phoneValue, phoneCode) => {
	if (!phoneValue || typeof phoneValue !== 'string') {
		return phoneValue
	}
	const hasCode = phoneCode != null && String(phoneCode).trim() !== ''
	if (!hasCode) {
		return phoneValue
	}
	return decrypt(phoneValue)
}

const emailEncryption = { encrypt, decrypt, decryptPhone }
module.exports = emailEncryption
