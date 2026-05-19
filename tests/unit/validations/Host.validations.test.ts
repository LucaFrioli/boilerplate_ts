import { describe, it, expect } from 'vitest';
import { HostValidator } from '@Validations/Host.validations.js';
import { validHosts, invalidHosts } from '@tests/helpers/mocks/test.fixtures.js';

describe('HostValidator (Black-Box)', () => {

	describe('Classificação de IPv4', () => {
		it('deve retornar "IPv4" para um endereço IPv4 válido', () => {
			expect(HostValidator.validateHostType(validHosts.ipv4)).toBe('IPv4');
		});

		it('deve retornar "IPv4" para 127.0.0.1 (loopback)', () => {
			expect(HostValidator.validateHostType('127.0.0.1')).toBe('IPv4');
		});

		it('deve retornar "IPv4" para 0.0.0.0 (any)', () => {
			expect(HostValidator.validateHostType('0.0.0.0')).toBe('IPv4');
		});

		it('deve retornar "IPv4" para 255.255.255.255 (broadcast)', () => {
			expect(HostValidator.validateHostType('255.255.255.255')).toBe('IPv4');
		});
	});

	describe('Classificação de IPv6', () => {
		it('deve retornar "IPv6" para ::1 (loopback)', () => {
			expect(HostValidator.validateHostType(validHosts.ipv6)).toBe('IPv6');
		});

		it('deve retornar "IPv6" para um endereço IPv6 completo', () => {
			expect(HostValidator.validateHostType('2001:0db8:85a3:0000:0000:8a2e:0370:7334')).toBe('IPv6');
		});

		it('deve retornar "IPv6" para :: (unspecified)', () => {
			expect(HostValidator.validateHostType('::')).toBe('IPv6');
		});
	});

	describe('Classificação de DNS', () => {
		it('deve retornar "DNS" para um domínio com subdomínio', () => {
			expect(HostValidator.validateHostType(validHosts.dns)).toBe('DNS');
		});

		it('deve retornar "DNS" para localhost', () => {
			expect(HostValidator.validateHostType(validHosts.localhost)).toBe('DNS');
		});

		it('deve retornar "DNS" para um domínio simples (example.com)', () => {
			expect(HostValidator.validateHostType('example.com')).toBe('DNS');
		});

		it('deve retornar "DNS" para domínio com múltiplos subdomínios', () => {
			expect(HostValidator.validateHostType('a.b.c.d.example.com')).toBe('DNS');
		});
	});

	describe('Hosts Inválidos', () => {
		it.each(invalidHosts)('deve retornar "invalid" para "%s"', (host) => {
			expect(HostValidator.validateHostType(host)).toBe('invalid');
		});

		it('deve retornar "invalid" para string com espaços', () => {
			expect(HostValidator.validateHostType('invalid host')).toBe('invalid');
		});

		it('deve retornar "invalid" para IP com porta embutida', () => {
			expect(HostValidator.validateHostType('192.168.0.1:6379')).toBe('invalid');
		});
	});
});
