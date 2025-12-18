/*
 * Rental Agreement Step Component for Booking Wizard
 * Copyright (c) 2025 Alexander Orlov.
 */

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { FileText, Check, ArrowLeft, ArrowRight, Trash2 } from 'lucide-react';

// Consent texts in multiple languages
const CONSENT_TEXTS = {
  en: {
    termsTitle: 'Terms and Conditions',
    termsText: 'I have read and agree to the rental terms and conditions, including liability limitations, insurance coverage, and rental policies.',
    nonRefundableTitle: 'Non-Refundable Policy',
    nonRefundableText: 'I understand and acknowledge that this rental reservation is NON-REFUNDABLE. No refunds will be issued for early returns, cancellations, or no-shows. By signing below, I waive any right to dispute this charge based on the non-refundable nature of this booking.',
    damagePolicyTitle: 'Damage Responsibility',
    damagePolicyText: 'I accept full responsibility for any damage to the vehicle during my rental period, including but not limited to: body damage, interior damage, tire damage, windshield damage, and mechanical damage caused by misuse. I authorize charges for repair costs to my payment method.',
    cardAuthorizationTitle: 'Card Authorization',
    cardAuthorizationText: 'I authorize the rental company to charge my credit/debit card on file for: the rental amount, security deposit, fuel charges if applicable, traffic violations, parking tickets, toll charges, damage repairs, cleaning fees, and any other charges incurred during or as a result of this rental.',
    signatureLabel: 'Your Signature',
    signatureHelper: 'Please sign in the box above using your mouse or finger',
    clearSignature: 'Clear',
    agreementTitle: 'Rental Agreement',
    agreementSubtitle: 'Please review and sign the rental agreement',
    rentalSummary: 'Rental Summary',
    vehicle: 'Vehicle',
    pickupDate: 'Pickup Date',
    returnDate: 'Return Date',
    totalAmount: 'Total Amount',
    securityDeposit: 'Security Deposit',
    requiredConsents: 'Please check all boxes to confirm you have read and agree to the terms',
    signatureRequired: 'Please provide your signature',
    allConsentsRequired: 'Please accept all terms and conditions',
  },
  es: {
    termsTitle: 'Términos y Condiciones',
    termsText: 'He leído y acepto los términos y condiciones del alquiler, incluyendo las limitaciones de responsabilidad, la cobertura del seguro y las políticas de alquiler.',
    nonRefundableTitle: 'Política de No Reembolso',
    nonRefundableText: 'Entiendo y reconozco que esta reserva de alquiler NO ES REEMBOLSABLE. No se emitirán reembolsos por devoluciones anticipadas, cancelaciones o ausencias. Al firmar a continuación, renuncio a cualquier derecho a disputar este cargo basándome en la naturaleza no reembolsable de esta reserva.',
    damagePolicyTitle: 'Responsabilidad por Daños',
    damagePolicyText: 'Acepto la responsabilidad total por cualquier daño al vehículo durante mi período de alquiler, incluyendo pero no limitado a: daños en la carrocería, daños interiores, daños en los neumáticos, daños en el parabrisas y daños mecánicos causados por mal uso. Autorizo los cargos por costos de reparación a mi método de pago.',
    cardAuthorizationTitle: 'Autorización de Tarjeta',
    cardAuthorizationText: 'Autorizo a la empresa de alquiler a cargar en mi tarjeta de crédito/débito registrada: el monto del alquiler, el depósito de seguridad, los cargos de combustible si corresponde, las infracciones de tráfico, las multas de estacionamiento, los cargos de peaje, las reparaciones por daños, las tarifas de limpieza y cualquier otro cargo incurrido durante o como resultado de este alquiler.',
    signatureLabel: 'Su Firma',
    signatureHelper: 'Por favor firme en el cuadro de arriba usando su mouse o dedo',
    clearSignature: 'Borrar',
    agreementTitle: 'Contrato de Alquiler',
    agreementSubtitle: 'Por favor revise y firme el contrato de alquiler',
    rentalSummary: 'Resumen del Alquiler',
    vehicle: 'Vehículo',
    pickupDate: 'Fecha de Recogida',
    returnDate: 'Fecha de Devolución',
    totalAmount: 'Monto Total',
    securityDeposit: 'Depósito de Seguridad',
    requiredConsents: 'Por favor marque todas las casillas para confirmar que ha leído y acepta los términos',
    signatureRequired: 'Por favor proporcione su firma',
    allConsentsRequired: 'Por favor acepte todos los términos y condiciones',
  },
  pt: {
    termsTitle: 'Termos e Condições',
    termsText: 'Li e concordo com os termos e condições do aluguel, incluindo limitações de responsabilidade, cobertura de seguro e políticas de aluguel.',
    nonRefundableTitle: 'Política Não Reembolsável',
    nonRefundableText: 'Entendo e reconheço que esta reserva de aluguel NÃO É REEMBOLSÁVEL. Nenhum reembolso será emitido para devoluções antecipadas, cancelamentos ou não comparecimentos. Ao assinar abaixo, renuncio a qualquer direito de contestar esta cobrança com base na natureza não reembolsável desta reserva.',
    damagePolicyTitle: 'Responsabilidade por Danos',
    damagePolicyText: 'Aceito total responsabilidade por qualquer dano ao veículo durante meu período de aluguel, incluindo, mas não limitado a: danos na carrocería, danos internos, danos nos pneus, danos no para-brisa e danos mecânicos causados por uso indevido. Autorizo cobranças de custos de reparo no meu método de pagamento.',
    cardAuthorizationTitle: 'Autorização de Cartão',
    cardAuthorizationText: 'Autorizo a empresa de aluguel a cobrar no meu cartão de crédito/débito registrado: o valor do aluguel, depósito de segurança, cobranças de combustível se aplicável, infrações de trânsito, multas de estacionamento, cobranças de pedágio, reparos de danos, taxas de limpeza e quaisquer outras cobranças incorridas durante ou como resultado deste aluguel.',
    signatureLabel: 'Sua Assinatura',
    signatureHelper: 'Por favor assine na caixa acima usando seu mouse ou dedo',
    clearSignature: 'Limpar',
    agreementTitle: 'Contrato de Aluguel',
    agreementSubtitle: 'Por favor revise e assine o contrato de aluguel',
    rentalSummary: 'Resumo do Aluguel',
    vehicle: 'Veículo',
    pickupDate: 'Data de Retirada',
    returnDate: 'Data de Devolução',
    totalAmount: 'Valor Total',
    securityDeposit: 'Depósito de Segurança',
    requiredConsents: 'Por favor marque todas as caixas para confirmar que leu e concorda com os termos',
    signatureRequired: 'Por favor forneça sua assinatura',
    allConsentsRequired: 'Por favor aceite todos os termos e condições',
  },
  de: {
    termsTitle: 'Allgemeine Geschäftsbedingungen',
    termsText: 'Ich habe die Mietbedingungen gelesen und stimme ihnen zu, einschließlich Haftungsbeschränkungen, Versicherungsschutz und Mietrichtlinien.',
    nonRefundableTitle: 'Nicht erstattungsfähige Richtlinie',
    nonRefundableText: 'Ich verstehe und erkenne an, dass diese Mietreservierung NICHT ERSTATTUNGSFÄHIG ist. Es werden keine Rückerstattungen für vorzeitige Rückgaben, Stornierungen oder Nichterscheinen gewährt. Mit meiner Unterschrift unten verzichte ich auf jedes Recht, diese Gebühr aufgrund der nicht erstattungsfähigen Natur dieser Buchung anzufechten.',
    damagePolicyTitle: 'Schadenshaftung',
    damagePolicyText: 'Ich übernehme die volle Verantwortung für alle Schäden am Fahrzeug während meiner Mietzeit, einschließlich, aber nicht beschränkt auf: Karosserieschäden, Innenraumschäden, Reifenschäden, Windschutzscheibenschäden und mechanische Schäden durch Missbrauch. Ich autorisiere die Belastung meiner Zahlungsmethode für Reparaturkosten.',
    cardAuthorizationTitle: 'Kartenauthorisierung',
    cardAuthorizationText: 'Ich autorisiere das Mietunternehmen, meine hinterlegte Kredit-/Debitkarte zu belasten für: den Mietbetrag, die Kaution, Kraftstoffgebühren falls zutreffend, Verkehrsverstöße, Parktickets, Mautgebühren, Schadensreparaturen, Reinigungsgebühren und alle anderen Gebühren, die während oder als Ergebnis dieser Miete anfallen.',
    signatureLabel: 'Ihre Unterschrift',
    signatureHelper: 'Bitte unterschreiben Sie im obigen Feld mit Ihrer Maus oder Ihrem Finger',
    clearSignature: 'Löschen',
    agreementTitle: 'Mietvertrag',
    agreementSubtitle: 'Bitte überprüfen und unterschreiben Sie den Mietvertrag',
    rentalSummary: 'Mietzusammenfassung',
    vehicle: 'Fahrzeug',
    pickupDate: 'Abholdatum',
    returnDate: 'Rückgabedatum',
    totalAmount: 'Gesamtbetrag',
    securityDeposit: 'Kaution',
    requiredConsents: 'Bitte aktivieren Sie alle Kontrollkästchen, um zu bestätigen, dass Sie die Bedingungen gelesen haben und ihnen zustimmen',
    signatureRequired: 'Bitte geben Sie Ihre Unterschrift an',
    allConsentsRequired: 'Bitte akzeptieren Sie alle Geschäftsbedingungen',
  },
  fr: {
    termsTitle: 'Termes et Conditions',
    termsText: 'J\'ai lu et j\'accepte les termes et conditions de location, y compris les limitations de responsabilité, la couverture d\'assurance et les politiques de location.',
    nonRefundableTitle: 'Politique Non Remboursable',
    nonRefundableText: 'Je comprends et reconnais que cette réservation de location est NON REMBOURSABLE. Aucun remboursement ne sera émis pour les retours anticipés, les annulations ou les absences. En signant ci-dessous, je renonce à tout droit de contester ce débit en raison de la nature non remboursable de cette réservation.',
    damagePolicyTitle: 'Responsabilité des Dommages',
    damagePolicyText: 'J\'accepte l\'entière responsabilité pour tout dommage au véhicule pendant ma période de location, y compris mais sans s\'y limiter : les dommages à la carrosserie, les dommages intérieurs, les dommages aux pneus, les dommages au pare-brise et les dommages mécaniques causés par une mauvaise utilisation. J\'autorise les frais de réparation sur mon mode de paiement.',
    cardAuthorizationTitle: 'Autorisation de Carte',
    cardAuthorizationText: 'J\'autorise la société de location à débiter ma carte de crédit/débit enregistrée pour : le montant de la location, le dépôt de garantie, les frais de carburant le cas échéant, les infractions routières, les contraventions de stationnement, les frais de péage, les réparations de dommages, les frais de nettoyage et tous autres frais encourus pendant ou à la suite de cette location.',
    signatureLabel: 'Votre Signature',
    signatureHelper: 'Veuillez signer dans la case ci-dessus avec votre souris ou votre doigt',
    clearSignature: 'Effacer',
    agreementTitle: 'Contrat de Location',
    agreementSubtitle: 'Veuillez examiner et signer le contrat de location',
    rentalSummary: 'Résumé de la Location',
    vehicle: 'Véhicule',
    pickupDate: 'Date de Prise en Charge',
    returnDate: 'Date de Retour',
    totalAmount: 'Montant Total',
    securityDeposit: 'Dépôt de Garantie',
    requiredConsents: 'Veuillez cocher toutes les cases pour confirmer que vous avez lu et acceptez les conditions',
    signatureRequired: 'Veuillez fournir votre signature',
    allConsentsRequired: 'Veuillez accepter toutes les conditions générales',
  },
};

// Get consent texts by language code
const getConsentTexts = (lang = 'en') => {
  const langCode = lang.toLowerCase().substring(0, 2);
  return CONSENT_TEXTS[langCode] || CONSENT_TEXTS.en;
};

// Signature Pad Component
const SignaturePad = ({ onSignatureChange, signatureData, disabled }) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    
    // Set canvas size to match display size
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);
    
    // Set drawing styles
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // Load existing signature if any
    if (signatureData) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, rect.width, rect.height);
        setHasSignature(true);
      };
      img.src = signatureData;
    }
  }, []);

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    if (e.touches) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const startDrawing = (e) => {
    if (disabled) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const { x, y } = getCoordinates(e);
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing || disabled) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const { x, y } = getCoordinates(e);
    
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    
    // Save signature
    const canvas = canvasRef.current;
    const dataUrl = canvas.toDataURL('image/png');
    onSignatureChange(dataUrl);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    setHasSignature(false);
    onSignatureChange(null);
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <canvas
          ref={canvasRef}
          className={`w-full h-32 border-2 rounded-lg bg-white touch-none ${
            disabled ? 'bg-gray-100 cursor-not-allowed' : 'border-gray-300 cursor-crosshair'
          } ${hasSignature ? 'border-green-500' : ''}`}
          style={{ touchAction: 'none' }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
        {!hasSignature && !disabled && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-gray-400">
            <span className="text-sm">Sign here</span>
          </div>
        )}
      </div>
      {hasSignature && !disabled && (
        <button
          type="button"
          onClick={clearSignature}
          className="flex items-center gap-1 text-sm text-red-600 hover:text-red-700"
        >
          <Trash2 className="h-4 w-4" />
          Clear
        </button>
      )}
    </div>
  );
};

// Consent Checkbox Component
const ConsentCheckbox = ({ id, checked, onChange, title, text, disabled }) => (
  <div className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
    <label className="flex items-start gap-3 cursor-pointer">
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="mt-1 h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
      />
      <div className="flex-1">
        <span className="font-medium text-gray-900 block mb-1">{title}</span>
        <span className="text-sm text-gray-600">{text}</span>
      </div>
    </label>
  </div>
);

// Main Rental Agreement Step Component
const RentalAgreementStep = ({
  language = 'en',
  rentalInfo,
  formatPrice,
  consents,
  setConsents,
  signatureData,
  setSignatureData,
  onNext,
  onPrevious,
  onCancel,
  loading,
  error,
  t = (key, fallback) => fallback,
}) => {
  const texts = getConsentTexts(language);

  const handleConsentChange = (key, value) => {
    setConsents(prev => ({
      ...prev,
      [key]: value,
      [`${key}AcceptedAt`]: value ? new Date().toISOString() : null,
    }));
  };

  const allConsentsAccepted = 
    consents.terms && 
    consents.nonRefundable && 
    consents.damagePolicy && 
    consents.cardAuthorization;

  const canProceed = allConsentsAccepted && signatureData;

  const handleNext = () => {
    if (!signatureData) {
      return;
    }
    if (!allConsentsAccepted) {
      return;
    }
    onNext();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <FileText className="h-12 w-12 text-blue-600 mx-auto mb-3" />
        <h3 className="text-xl font-semibold text-gray-900">
          {t('bookPage.rentalAgreementTitle', texts.agreementTitle)}
        </h3>
        <p className="text-gray-600 mt-1">
          {t('bookPage.rentalAgreementSubtitle', texts.agreementSubtitle)}
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Rental Summary */}
      {rentalInfo && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-3">
            {t('bookPage.rentalSummary', texts.rentalSummary)}
          </h4>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-500">{texts.vehicle}:</span>
              <p className="font-medium">{rentalInfo.vehicleName}</p>
            </div>
            <div>
              <span className="text-gray-500">{texts.pickupDate}:</span>
              <p className="font-medium">{rentalInfo.pickupDate}</p>
            </div>
            <div>
              <span className="text-gray-500">{texts.returnDate}:</span>
              <p className="font-medium">{rentalInfo.returnDate}</p>
            </div>
            <div>
              <span className="text-gray-500">{texts.totalAmount}:</span>
              <p className="font-medium text-green-600">
                {formatPrice ? formatPrice(rentalInfo.totalAmount) : `$${rentalInfo.totalAmount}`}
              </p>
            </div>
            {rentalInfo.securityDeposit > 0 && (
              <div className="col-span-2">
                <span className="text-gray-500">{texts.securityDeposit}:</span>
                <p className="font-medium">
                  {formatPrice ? formatPrice(rentalInfo.securityDeposit) : `$${rentalInfo.securityDeposit}`}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Consent Checkboxes */}
      <div className="space-y-3">
        <p className="text-sm text-gray-600 font-medium">
          {t('bookPage.requiredConsents', texts.requiredConsents)}
        </p>
        
        <ConsentCheckbox
          id="consent-terms"
          checked={consents.terms}
          onChange={(val) => handleConsentChange('terms', val)}
          title={texts.termsTitle}
          text={texts.termsText}
          disabled={loading}
        />
        
        <ConsentCheckbox
          id="consent-nonrefundable"
          checked={consents.nonRefundable}
          onChange={(val) => handleConsentChange('nonRefundable', val)}
          title={texts.nonRefundableTitle}
          text={texts.nonRefundableText}
          disabled={loading}
        />
        
        <ConsentCheckbox
          id="consent-damage"
          checked={consents.damagePolicy}
          onChange={(val) => handleConsentChange('damagePolicy', val)}
          title={texts.damagePolicyTitle}
          text={texts.damagePolicyText}
          disabled={loading}
        />
        
        <ConsentCheckbox
          id="consent-card"
          checked={consents.cardAuthorization}
          onChange={(val) => handleConsentChange('cardAuthorization', val)}
          title={texts.cardAuthorizationTitle}
          text={texts.cardAuthorizationText}
          disabled={loading}
        />
      </div>

      {/* Signature Section */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          {t('bookPage.signatureLabel', texts.signatureLabel)} *
        </label>
        <SignaturePad
          signatureData={signatureData}
          onSignatureChange={setSignatureData}
          disabled={loading}
        />
        <p className="text-xs text-gray-500">
          {t('bookPage.signatureHelper', texts.signatureHelper)}
        </p>
      </div>

      {/* Validation Messages */}
      {!allConsentsAccepted && (
        <p className="text-sm text-amber-600">
          <Check className="h-4 w-4 inline mr-1" />
          {t('bookPage.allConsentsRequired', texts.allConsentsRequired)}
        </p>
      )}
      {!signatureData && (
        <p className="text-sm text-amber-600">
          <Check className="h-4 w-4 inline mr-1" />
          {t('bookPage.signatureRequired', texts.signatureRequired)}
        </p>
      )}

      {/* Navigation Buttons */}
      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
          disabled={loading}
        >
          {t('common.cancel', 'Cancel')}
        </button>
        <button
          type="button"
          onClick={onPrevious}
          className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center justify-center"
          disabled={loading}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('common.back', 'Back')}
        </button>
        <button
          type="button"
          onClick={handleNext}
          className={`flex-1 py-2 px-4 rounded-lg flex items-center justify-center ${
            canProceed
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
          disabled={loading || !canProceed}
        >
          {t('common.next', 'Next')}
          <ArrowRight className="h-4 w-4 ml-2" />
        </button>
      </div>
    </div>
  );
};

export default RentalAgreementStep;
export { SignaturePad, ConsentCheckbox, CONSENT_TEXTS, getConsentTexts };

