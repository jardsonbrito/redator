import * as React from 'react';
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Heading,
  Text,
  Button,
  Img,
  Hr,
  Link,
  Font,
} from '@react-email/components';

interface CorrectionEmailProps {
  studentName: string;
  redacaoTema: string;
  tipoEnvio: 'Regular' | 'Simulado' | 'Exercício' | 'Lousa';
  corretorNome: string;
  correctionUrl: string;
  nota?: number;
}

export const CorrectionEmail = ({
  studentName,
  redacaoTema,
  tipoEnvio,
  corretorNome,
  correctionUrl,
  nota
}: CorrectionEmailProps) => {
  return (
    <Html>
      <Head>
        <Font
          fontFamily="Inter"
          fallbackFontFamily="Helvetica"
          webFont={{
            url: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
            format: 'woff2',
          }}
          fontWeight={400}
          fontStyle="normal"
        />
      </Head>
      <Body style={main}>
        <Container style={container}>
          {/* Header com Logo */}
          <Section style={logoSection}>
            <Img
              src="https://redator.laboratoriodoredator.com/lovable-uploads/f86e5092-80dc-4e06-bb6a-f4cec6ee1b5b.png"
              alt="App do Redator"
              width="120"
              height="90"
              style={logo}
            />
          </Section>

          {/* Conteúdo Principal */}
          <Section style={content}>
            <Heading style={h1}>
              🎉 {tipoEnvio === 'Exercício' ? 'Seu exercício foi corrigido!' : tipoEnvio === 'Lousa' ? 'Sua lousa foi corrigida!' : 'Sua redação foi corrigida!'}
            </Heading>
            
            <Text style={text}>
              Olá <strong>{studentName}</strong>, {tipoEnvio === 'Exercício' ? 'seu exercício acaba de ser corrigido' : tipoEnvio === 'Lousa' ? 'sua lousa acaba de ser corrigida' : 'sua redação acaba de ser corrigida'}.
            </Text>

            {nota && (
              <Section style={noteSection}>
                <Text style={noteText}>
                  📊 <strong>Nota recebida:</strong> {nota}/10
                </Text>
              </Section>
            )}

            {/* Caixa de Informações */}
            <Section style={infoBox}>
              <Text style={infoTitle}>📋 Detalhes da Correção</Text>
              <Hr style={divider} />
              
              <Text style={infoItem}>
                <strong>📝 Tema:</strong> {redacaoTema}
              </Text>
              
              <Text style={infoItem}>
                <strong>📚 Tipo:</strong> {tipoEnvio}
              </Text>
              
              <Text style={infoItem}>
                <strong>👨‍🏫 Corretor:</strong> {corretorNome}
              </Text>
            </Section>

            {/* Call to Action */}
            <Section style={buttonSection}>
              <Button style={button} href={correctionUrl}>
                Ver Correção Completa
              </Button>
            </Section>

            <Text style={footerText}>
              Clique no botão acima para ter acesso aos detalhes da correção, comentários e orientações do seu corretor.
            </Text>
          </Section>

          {/* Footer */}
          <Section style={footer}>
            <Hr style={divider} />
            <Text style={footerWarning}>
              ⚠️ <strong>Importante:</strong> Caso você não reconheça este email, ignore esta mensagem.
            </Text>
            <Text style={footerLinks}>
              <Link href="https://redator.laboratoriodoredator.com" style={link}>
                App do Redator
              </Link>
              {' · '}
              <Link href="mailto:contato@laboratoriodoredator.com" style={link}>
                Suporte
              </Link>
            </Text>
            <Text style={footerCopyright}>
              © {new Date().getFullYear()} App do Redator - Todos os direitos reservados
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

// Estilos do email
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  border: '1px solid #eaeaea',
  borderRadius: '8px',
  margin: '40px auto',
  padding: '0',
  width: '600px',
  maxWidth: '100%',
};

const logoSection = {
  padding: '40px 40px 20px 40px',
  textAlign: 'center' as const,
  backgroundColor: '#6B46C1',
};

const logo = {
  margin: '0 auto',
};

const content = {
  padding: '40px',
};

const h1 = {
  color: '#333333',
  fontSize: '24px',
  fontWeight: '600',
  lineHeight: '1.4',
  margin: '0 0 20px 0',
  textAlign: 'center' as const,
};

const text = {
  color: '#555555',
  fontSize: '16px',
  lineHeight: '1.6',
  margin: '0 0 20px 0',
};

const noteSection = {
  backgroundColor: '#f0f9ff',
  border: '2px solid #0ea5e9',
  borderRadius: '8px',
  padding: '16px',
  margin: '20px 0',
  textAlign: 'center' as const,
};

const noteText = {
  color: '#0369a1',
  fontSize: '18px',
  fontWeight: '600',
  margin: '0',
};

const infoBox = {
  backgroundColor: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  padding: '24px',
  margin: '24px 0',
};

const infoTitle = {
  color: '#1e293b',
  fontSize: '18px',
  fontWeight: '600',
  margin: '0 0 16px 0',
};

const infoItem = {
  color: '#475569',
  fontSize: '15px',
  lineHeight: '1.6',
  margin: '8px 0',
};

const divider = {
  border: 'none',
  borderTop: '1px solid #e2e8f0',
  margin: '16px 0',
  width: '100%',
};

const buttonSection = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const button = {
  backgroundColor: '#6B46C1',
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 32px',
  lineHeight: '1.5',
};

const footerText = {
  color: '#64748b',
  fontSize: '14px',
  lineHeight: '1.6',
  margin: '20px 0',
  textAlign: 'center' as const,
};

const footer = {
  padding: '32px 40px 40px 40px',
};

const footerWarning = {
  color: '#dc2626',
  fontSize: '14px',
  lineHeight: '1.6',
  margin: '16px 0',
  textAlign: 'center' as const,
};

const footerLinks = {
  color: '#64748b',
  fontSize: '12px',
  lineHeight: '1.6',
  margin: '8px 0',
  textAlign: 'center' as const,
};

const footerCopyright = {
  color: '#94a3b8',
  fontSize: '12px',
  lineHeight: '1.6',
  margin: '8px 0 0 0',
  textAlign: 'center' as const,
};

const link = {
  color: '#6B46C1',
  textDecoration: 'underline',
};

export default CorrectionEmail;