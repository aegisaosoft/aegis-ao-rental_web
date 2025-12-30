/*
 * Rental Agreement Modal Component
 * Copyright (c) 2025 Alexander Orlov.
 */

import React, { useState, useEffect, useRef } from 'react';
import { X, Check, Trash2 } from 'lucide-react';

// ============== LOCAL DEFINITIONS (self-contained) ==============

// Rules texts - matching aegis-aa-web format
const RULES_TEXTS = {
  en: {
    rulesTitle: 'RULES OF ACTION',
    rulesSubtitle: '(see also Terms and Conditions)',
    ruleProhibitedDriver: 'It is absolutely PROHIBITED to use or operate this rented vehicle by anyone not listed on the rental agreement. Each driver must be pre-qualified in person with valid drivers license and be a minimum of 21 years of age.',
    ruleUnder25: 'If Driver is under the age of 25 additional fees may apply.',
    ruleAlcohol: 'It is absolutely PROHIBITED to use or operate this rented vehicle by anyone who is under the influence of ALCOHOL or any NARCOTICS.',
    ruleNoSmoking: 'There is absolute NO SMOKING allowed in the rented vehicle under any circumstances. Any found evidence of any kind of smoking in the vehicle a fine regardless of damage or not will apply.',
    ruleLostKeys: 'In case of LOST, DAMAGED or LOCKED INSIDE KEYS requiring key recovery a maximum charge may apply.',
    rulePassengerCapacity: 'The passenger capacity of this vehicle is determined by the number of seatbelts and, by law, must NOT be EXCEEDED. While in the Vehicle, please always fasten your seatbelts. It is the law!',
    ruleCleaningFee: 'In case the Vehicle will be returned exceptionally dirty a CLEANING FEE may apply.',
    ruleTires: "Flat or damaged TIRES are renter's responsibility of the Renter and are the financial responsibility of the Renter or Authorized Driver(s).",
    ruleTickets: 'ALL TICKETS, FINES, FEES and other received during the rental period, caused as a result of the renter and/or rental period must be paid by the Renter.',
    rule24Hour: 'Rental Days are based on 24 hour Rental Periods. Please return at the proper time. Each hour past the Rental Period will be calculated at ¼ of a day charge including all taxes and fees and up to a full day.',
    ruleNoCellPhone: "No cell phone use while operating the Vehicle unless it is a hands free device such as a Bluetooth. It's the law, the driver is prohibited from handling any Electronic device while driving regardless of the behavior of use.",
    ruleCardAuthorization: 'I authorize the rental company to charge my credit/debit card on file for: the rental amount, security deposit, fuel charges if applicable, traffic violations, parking tickets, toll charges, damage repairs, cleaning fees, and any other charges incurred during or as a result of this rental.',
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
    signatureRequired: 'Please provide your signature',
    allConsentsRequired: 'Please check all rules to continue',
  },
  es: {
    rulesTitle: 'REGLAS DE ACCIÓN',
    rulesSubtitle: '(ver también Términos y Condiciones)',
    ruleProhibitedDriver: 'Está absolutamente PROHIBIDO usar u operar este vehículo alquilado por cualquier persona que no esté listada en el contrato de alquiler. Cada conductor debe ser precalificado en persona con licencia de conducir válida y tener un mínimo de 21 años de edad.',
    ruleUnder25: 'Si el conductor es menor de 25 años pueden aplicar tarifas adicionales.',
    ruleAlcohol: 'Está absolutamente PROHIBIDO usar u operar este vehículo alquilado por cualquier persona que esté bajo la influencia de ALCOHOL o cualquier NARCÓTICO.',
    ruleNoSmoking: 'NO está permitido FUMAR en el vehículo alquilado bajo ninguna circunstancia. Cualquier evidencia encontrada de cualquier tipo de fumar en el vehículo aplicará una multa independientemente de si hay daño o no.',
    ruleLostKeys: 'En caso de LLAVES PERDIDAS, DAÑADAS o BLOQUEADAS DENTRO que requieran recuperación de llaves, puede aplicar un cargo máximo.',
    rulePassengerCapacity: 'La capacidad de pasajeros de este vehículo está determinada por el número de cinturones de seguridad y, por ley, NO debe EXCEDERSE. Mientras esté en el vehículo, siempre use el cinturón de seguridad. ¡Es la ley!',
    ruleCleaningFee: 'En caso de que el vehículo sea devuelto excepcionalmente sucio, puede aplicar una TARIFA DE LIMPIEZA.',
    ruleTires: 'Los NEUMÁTICOS pinchados o dañados son responsabilidad del Arrendatario y son la responsabilidad financiera del Arrendatario o Conductor(es) Autorizado(s).',
    ruleTickets: 'TODAS LAS MULTAS, PENALIZACIONES, TARIFAS y otros recibidos durante el período de alquiler, causados como resultado del arrendatario y/o período de alquiler deben ser pagados por el Arrendatario.',
    rule24Hour: 'Los Días de Alquiler se basan en Períodos de Alquiler de 24 horas. Por favor devuelva a tiempo. Cada hora pasada del Período de Alquiler se calculará a ¼ del cargo diario incluyendo todos los impuestos y tarifas y hasta un día completo.',
    ruleNoCellPhone: 'No usar el celular mientras opera el Vehículo a menos que sea un dispositivo manos libres como Bluetooth. Es la ley, el conductor tiene prohibido manejar cualquier dispositivo electrónico mientras conduce independientemente del comportamiento de uso.',
    ruleCardAuthorization: 'Autorizo a la empresa de alquiler a cargar en mi tarjeta de crédito/débito: el monto del alquiler, depósito de seguridad, cargos de combustible si aplica, infracciones de tráfico, multas de estacionamiento, cargos de peaje, reparaciones por daños, tarifas de limpieza y cualquier otro cargo incurrido durante o como resultado de este alquiler.',
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
    signatureRequired: 'Por favor proporcione su firma',
    allConsentsRequired: 'Por favor marque todas las reglas para continuar',
  },
  pt: {
    rulesTitle: 'REGRAS DE AÇÃO',
    rulesSubtitle: '(veja também Termos e Condições)',
    ruleProhibitedDriver: 'É absolutamente PROIBIDO usar ou operar este veículo alugado por qualquer pessoa não listada no contrato de aluguel. Cada motorista deve ser pré-qualificado pessoalmente com carteira de motorista válida e ter no mínimo 21 anos de idade.',
    ruleUnder25: 'Se o motorista tiver menos de 25 anos, taxas adicionais podem ser aplicadas.',
    ruleAlcohol: 'É absolutamente PROIBIDO usar ou operar este veículo alugado por qualquer pessoa que esteja sob a influência de ÁLCOOL ou qualquer NARCÓTICO.',
    ruleNoSmoking: 'NÃO é permitido FUMAR no veículo alugado sob nenhuma circunstância. Qualquer evidência encontrada de qualquer tipo de fumar no veículo, uma multa será aplicada independentemente de haver dano ou não.',
    ruleLostKeys: 'Em caso de CHAVES PERDIDAS, DANIFICADAS ou TRANCADAS DENTRO que requeiram recuperação de chaves, uma taxa máxima pode ser aplicada.',
    rulePassengerCapacity: 'A capacidade de passageiros deste veículo é determinada pelo número de cintos de segurança e, por lei, NÃO deve ser EXCEDIDA. Enquanto estiver no veículo, sempre use o cinto de segurança. É a lei!',
    ruleCleaningFee: 'Caso o veículo seja devolvido excepcionalmente sujo, uma TAXA DE LIMPEZA pode ser aplicada.',
    ruleTires: 'PNEUS furados ou danificados são responsabilidade do Locatário e são de responsabilidade financeira do Locatário ou Motorista(s) Autorizado(s).',
    ruleTickets: 'TODAS AS MULTAS, PENALIDADES, TAXAS e outros recebidos durante o período de aluguel, causados como resultado do locatário e/ou período de aluguel devem ser pagos pelo Locatário.',
    rule24Hour: 'Os Dias de Aluguel são baseados em Períodos de Aluguel de 24 horas. Por favor devolva no horário correto. Cada hora após o Período de Aluguel será calculada a ¼ da diária incluindo todos os impostos e taxas e até um dia inteiro.',
    ruleNoCellPhone: 'Não usar o celular enquanto opera o Veículo a menos que seja um dispositivo viva-voz como Bluetooth. É a lei, o motorista está proibido de manusear qualquer dispositivo eletrônico enquanto dirige, independentemente do comportamento de uso.',
    ruleCardAuthorization: 'Autorizo a empresa de aluguel a cobrar no meu cartão de crédito/débito: o valor do aluguel, depósito de segurança, cobranças de combustível se aplicável, infrações de trânsito, multas de estacionamento, cobranças de pedágio, reparos de danos, taxas de limpeza e quaisquer outras cobranças incorridas durante ou como resultado deste aluguel.',
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
    signatureRequired: 'Por favor forneça sua assinatura',
    allConsentsRequired: 'Por favor marque todas as regras para continuar',
  },
  de: {
    rulesTitle: 'VERHALTENSREGELN',
    rulesSubtitle: '(siehe auch Allgemeine Geschäftsbedingungen)',
    ruleProhibitedDriver: 'Es ist absolut VERBOTEN, dieses gemietete Fahrzeug von Personen zu benutzen oder zu bedienen, die nicht im Mietvertrag aufgeführt sind. Jeder Fahrer muss persönlich mit gültigem Führerschein vorqualifiziert sein und mindestens 21 Jahre alt sein.',
    ruleUnder25: 'Wenn der Fahrer unter 25 Jahre alt ist, können zusätzliche Gebühren anfallen.',
    ruleAlcohol: 'Es ist absolut VERBOTEN, dieses gemietete Fahrzeug von Personen zu benutzen oder zu bedienen, die unter dem Einfluss von ALKOHOL oder BETÄUBUNGSMITTELN stehen.',
    ruleNoSmoking: 'RAUCHEN ist im gemieteten Fahrzeug unter keinen Umständen erlaubt. Bei jedem Nachweis von Rauchen im Fahrzeug wird eine Geldstrafe erhoben, unabhängig davon, ob ein Schaden entstanden ist oder nicht.',
    ruleLostKeys: 'Im Falle von VERLORENEN, BESCHÄDIGTEN oder INNEN EINGESCHLOSSENEN SCHLÜSSELN, die eine Schlüsselwiederherstellung erfordern, kann eine Maximalgebühr anfallen.',
    rulePassengerCapacity: 'Die Passagierkapazität dieses Fahrzeugs wird durch die Anzahl der Sicherheitsgurte bestimmt und darf gesetzlich NICHT ÜBERSCHRITTEN werden. Bitte schnallen Sie sich im Fahrzeug immer an. Es ist Gesetz!',
    ruleCleaningFee: 'Falls das Fahrzeug außergewöhnlich schmutzig zurückgegeben wird, kann eine REINIGUNGSGEBÜHR anfallen.',
    ruleTires: 'Platte oder beschädigte REIFEN liegen in der Verantwortung des Mieters und sind die finanzielle Verantwortung des Mieters oder autorisierten Fahrer(s).',
    ruleTickets: 'ALLE BUSSGELDER, STRAFEN, GEBÜHREN und andere während der Mietzeit erhaltene, die durch den Mieter und/oder die Mietzeit verursacht wurden, müssen vom Mieter bezahlt werden.',
    rule24Hour: 'Miettage basieren auf 24-Stunden-Mietperioden. Bitte geben Sie rechtzeitig zurück. Jede Stunde nach der Mietperiode wird mit ¼ Tagesgebühr berechnet, einschließlich aller Steuern und Gebühren und bis zu einem vollen Tag.',
    ruleNoCellPhone: 'Keine Handynutzung während des Fahrens des Fahrzeugs, es sei denn, es handelt sich um ein Freisprechgerät wie Bluetooth. Es ist Gesetz, dem Fahrer ist es verboten, während der Fahrt irgendein elektronisches Gerät zu bedienen, unabhängig vom Nutzungsverhalten.',
    ruleCardAuthorization: 'Ich autorisiere das Mietunternehmen, meine Kredit-/Debitkarte zu belasten für: den Mietbetrag, Kaution, Kraftstoffgebühren falls zutreffend, Verkehrsverstöße, Parktickets, Mautgebühren, Schadensreparaturen, Reinigungsgebühren und alle anderen Gebühren, die während oder als Ergebnis dieser Miete anfallen.',
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
    signatureRequired: 'Bitte geben Sie Ihre Unterschrift an',
    allConsentsRequired: 'Bitte markieren Sie alle Regeln um fortzufahren',
  },
  fr: {
    rulesTitle: "RÈGLES D'ACTION",
    rulesSubtitle: '(voir aussi Termes et Conditions)',
    ruleProhibitedDriver: "Il est absolument INTERDIT d'utiliser ou de conduire ce véhicule loué par toute personne non inscrite sur le contrat de location. Chaque conducteur doit être pré-qualifié en personne avec un permis de conduire valide et avoir au moins 21 ans.",
    ruleUnder25: "Si le conducteur a moins de 25 ans, des frais supplémentaires peuvent s'appliquer.",
    ruleAlcohol: "Il est absolument INTERDIT d'utiliser ou de conduire ce véhicule loué par toute personne sous l'influence d'ALCOOL ou de tout STUPÉFIANT.",
    ruleNoSmoking: "Il est absolument INTERDIT de FUMER dans le véhicule loué en toutes circonstances. Toute preuve de tabagisme dans le véhicule entraînera une amende, qu'il y ait des dommages ou non.",
    ruleLostKeys: "En cas de CLÉS PERDUES, ENDOMMAGÉES ou ENFERMÉES À L'INTÉRIEUR nécessitant une récupération de clés, des frais maximum peuvent s'appliquer.",
    rulePassengerCapacity: "La capacité de passagers de ce véhicule est déterminée par le nombre de ceintures de sécurité et, selon la loi, ne doit PAS être DÉPASSÉE. Dans le véhicule, attachez toujours votre ceinture de sécurité. C'est la loi!",
    ruleCleaningFee: "Si le véhicule est retourné exceptionnellement sale, des FRAIS DE NETTOYAGE peuvent s'appliquer.",
    ruleTires: 'Les PNEUS crevés ou endommagés sont la responsabilité du Locataire et sont la responsabilité financière du Locataire ou du(des) Conducteur(s) Autorisé(s).',
    ruleTickets: 'TOUTES LES CONTRAVENTIONS, AMENDES, FRAIS et autres reçus pendant la période de location, causés par le locataire et/ou la période de location doivent être payés par le Locataire.',
    rule24Hour: "Les Jours de Location sont basés sur des Périodes de Location de 24 heures. Veuillez retourner à l'heure. Chaque heure après la Période de Location sera calculée à ¼ du tarif journalier incluant toutes les taxes et frais et jusqu'à une journée complète.",
    ruleNoCellPhone: "Pas d'utilisation de téléphone portable lors de la conduite du Véhicule sauf s'il s'agit d'un appareil mains libres comme le Bluetooth. C'est la loi, le conducteur est interdit de manipuler tout appareil électronique pendant la conduite, quel que soit le comportement d'utilisation.",
    ruleCardAuthorization: "J'autorise la société de location à débiter ma carte de crédit/débit pour: le montant de la location, le dépôt de garantie, les frais de carburant le cas échéant, les infractions routières, les contraventions de stationnement, les frais de péage, les réparations de dommages, les frais de nettoyage et tous autres frais encourus pendant ou à la suite de cette location.",
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
    signatureRequired: 'Veuillez fournir votre signature',
    allConsentsRequired: 'Veuillez cocher toutes les règles pour continuer',
  },
};

// Get texts by language code
const getConsentTexts = (lang = 'en') => {
  const langCode = lang.toLowerCase().substring(0, 2);
  return RULES_TEXTS[langCode] || RULES_TEXTS.en;
};

// List of all rules that need to be checked
const RULE_KEYS = [
  'prohibitedDriver',
  'alcohol',
  'noSmoking',
  'lostKeys',
  'passengerCapacity',
  'cleaningFee',
  'tires',
  'tickets',
  'hour24',
  'noCellPhone',
  'cardAuthorization',
];

// Signature Pad Component
const SignaturePad = ({ onSignatureChange, signatureData, disabled }) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);
    
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    if (signatureData) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, rect.width, rect.height);
        setHasSignature(true);
      };
      img.src = signatureData;
    }
  }, [signatureData]);

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

// Rule Item Component - checkbox on the left, text on the right
const RuleCheckbox = ({ id, checked, onChange, text, addon, disabled }) => (
  <div className="border-b border-gray-200 py-3">
    <label className="flex items-start gap-3 cursor-pointer">
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="mt-1 h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 flex-shrink-0"
      />
      <div className="flex-1 text-sm text-gray-700 leading-relaxed">
        {text}
        {addon && <span className="ml-1 text-gray-600">{addon}</span>}
      </div>
    </label>
  </div>
);

// ============== MAIN COMPONENT ==============

const RentalAgreementModal = ({
  isOpen,
  onClose,
  onConfirm,
  language = 'en',
  rentalInfo = {},
  formatPrice = (price) => `$${price?.toFixed(2) || '0.00'}`,
  consents = {},
  setConsents,
  signatureData = null,
  setSignatureData,
  loading = false,
  viewMode = false,
  agreementData = null,
  t = (key, defaultValue) => defaultValue,
}) => {
  const getInitialConsents = () => {
    const initial = {};
    RULE_KEYS.forEach(key => {
      initial[key] = consents[key] || false;
      initial[`${key}AcceptedAt`] = consents[`${key}AcceptedAt`] || null;
    });
    return initial;
  };

  const [localConsents, setLocalConsents] = useState(getInitialConsents());
  const [localSignature, setLocalSignature] = useState(signatureData);

  const texts = getConsentTexts(language);

  useEffect(() => {
    if (!viewMode) {
      const initial = {};
      RULE_KEYS.forEach(key => {
        initial[key] = consents[key] || false;
        initial[`${key}AcceptedAt`] = consents[`${key}AcceptedAt`] || null;
      });
      setLocalConsents(initial);
      setLocalSignature(signatureData);
    }
  }, [consents, signatureData, viewMode]);

  const getDisplayConsents = () => {
    if (viewMode && agreementData) {
      const display = {};
      RULE_KEYS.forEach(key => {
        display[key] = !!agreementData.consents?.[`${key}AcceptedAt`];
      });
      return display;
    }
    return localConsents;
  };

  const displayConsents = getDisplayConsents();

  const displaySignature = viewMode && agreementData?.signatureImage 
    ? agreementData.signatureImage 
    : localSignature;

  const handleConsentChange = (type, checked) => {
    if (viewMode) return;
    
    const now = checked ? new Date().toISOString() : null;
    const newConsents = {
      ...localConsents,
      [type]: checked,
      [`${type}AcceptedAt`]: now,
    };
    setLocalConsents(newConsents);
    if (setConsents) {
      setConsents(newConsents);
    }
  };

  const handleSignatureChange = (newSignature) => {
    if (viewMode) return;
    setLocalSignature(newSignature);
    if (setSignatureData) {
      setSignatureData(newSignature);
    }
  };

  const allConsentsAccepted = RULE_KEYS.every(key => displayConsents[key]);
  const canProceed = allConsentsAccepted && displaySignature;

  const handleConfirm = () => {
    if (viewMode) {
      onClose();
      return;
    }
    
    if (!canProceed) return;
    
    if (onConfirm) {
      onConfirm({
        signature: localSignature,
        consents: localConsents,
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/50" onClick={viewMode ? onClose : undefined} />
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {t('bookPage.agreementTitle', texts.agreementTitle)}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {viewMode 
                ? t('bookPage.viewAgreement', 'View Rental Agreement')
                : t('bookPage.agreementSubtitle', texts.agreementSubtitle)
              }
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-gray-500 hover:bg-gray-100 transition-colors"
            disabled={loading}
            title={t('common.close', 'Close')}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Rental Summary */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3">
              {t('bookPage.rentalSummary', texts.rentalSummary)}
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">{t('bookPage.vehicle', texts.vehicle)}:</span>
                <span className="ml-2 font-medium">{rentalInfo.vehicleName || '-'}</span>
              </div>
              <div>
                <span className="text-gray-600">{t('bookPage.pickupDate', texts.pickupDate)}:</span>
                <span className="ml-2 font-medium">{rentalInfo.pickupDate || '-'}</span>
              </div>
              <div>
                <span className="text-gray-600">{t('bookPage.returnDate', texts.returnDate)}:</span>
                <span className="ml-2 font-medium">{rentalInfo.returnDate || '-'}</span>
              </div>
              <div>
                <span className="text-gray-600">{t('bookPage.totalAmount', texts.totalAmount)}:</span>
                <span className="ml-2 font-medium">{formatPrice(rentalInfo.totalAmount || 0)}</span>
              </div>
              {rentalInfo.securityDeposit > 0 && (
                <div>
                  <span className="text-gray-600">{t('bookPage.securityDeposit', texts.securityDeposit)}:</span>
                  <span className="ml-2 font-medium">{formatPrice(rentalInfo.securityDeposit)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Rules of Action Section */}
          <div className="bg-white border border-gray-200 rounded-lg">
            <div className="bg-gray-100 px-4 py-3 border-b border-gray-200">
              <h4 className="font-bold text-gray-900">{texts.rulesTitle}</h4>
              <p className="text-sm text-gray-600">{texts.rulesSubtitle}</p>
            </div>
            
            <div className="px-4">
              <RuleCheckbox
                id="modal-rule-prohibitedDriver"
                checked={displayConsents.prohibitedDriver}
                onChange={(val) => handleConsentChange('prohibitedDriver', val)}
                text={texts.ruleProhibitedDriver}
                addon={texts.ruleUnder25}
                disabled={loading || viewMode}
              />
              
              <RuleCheckbox
                id="modal-rule-alcohol"
                checked={displayConsents.alcohol}
                onChange={(val) => handleConsentChange('alcohol', val)}
                text={texts.ruleAlcohol}
                disabled={loading || viewMode}
              />
              
              <RuleCheckbox
                id="modal-rule-noSmoking"
                checked={displayConsents.noSmoking}
                onChange={(val) => handleConsentChange('noSmoking', val)}
                text={texts.ruleNoSmoking}
                disabled={loading || viewMode}
              />
              
              <RuleCheckbox
                id="modal-rule-lostKeys"
                checked={displayConsents.lostKeys}
                onChange={(val) => handleConsentChange('lostKeys', val)}
                text={texts.ruleLostKeys}
                disabled={loading || viewMode}
              />
              
              <RuleCheckbox
                id="modal-rule-passengerCapacity"
                checked={displayConsents.passengerCapacity}
                onChange={(val) => handleConsentChange('passengerCapacity', val)}
                text={texts.rulePassengerCapacity}
                disabled={loading || viewMode}
              />
              
              <RuleCheckbox
                id="modal-rule-cleaningFee"
                checked={displayConsents.cleaningFee}
                onChange={(val) => handleConsentChange('cleaningFee', val)}
                text={texts.ruleCleaningFee}
                disabled={loading || viewMode}
              />
              
              <RuleCheckbox
                id="modal-rule-tires"
                checked={displayConsents.tires}
                onChange={(val) => handleConsentChange('tires', val)}
                text={texts.ruleTires}
                disabled={loading || viewMode}
              />
              
              <RuleCheckbox
                id="modal-rule-tickets"
                checked={displayConsents.tickets}
                onChange={(val) => handleConsentChange('tickets', val)}
                text={texts.ruleTickets}
                disabled={loading || viewMode}
              />
              
              <RuleCheckbox
                id="modal-rule-hour24"
                checked={displayConsents.hour24}
                onChange={(val) => handleConsentChange('hour24', val)}
                text={texts.rule24Hour}
                disabled={loading || viewMode}
              />
              
              <RuleCheckbox
                id="modal-rule-noCellPhone"
                checked={displayConsents.noCellPhone}
                onChange={(val) => handleConsentChange('noCellPhone', val)}
                text={texts.ruleNoCellPhone}
                disabled={loading || viewMode}
              />
              
              <RuleCheckbox
                id="modal-rule-cardAuthorization"
                checked={displayConsents.cardAuthorization}
                onChange={(val) => handleConsentChange('cardAuthorization', val)}
                text={texts.ruleCardAuthorization}
                disabled={loading || viewMode}
              />
            </div>
          </div>

          {/* Signature Section */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              {t('bookPage.signatureLabel', texts.signatureLabel)} {!viewMode && '*'}
            </label>
            <SignaturePad
              signatureData={displaySignature}
              onSignatureChange={handleSignatureChange}
              disabled={loading || viewMode}
            />
            {!viewMode && (
              <p className="text-xs text-gray-500">
                {t('bookPage.signatureHelper', texts.signatureHelper)}
              </p>
            )}
          </div>

          {/* Validation Messages */}
          {!viewMode && (
            <>
              {!allConsentsAccepted && (
                <p className="text-sm text-amber-600">
                  <Check className="h-4 w-4 inline mr-1" />
                  {t('bookPage.allConsentsRequired', texts.allConsentsRequired)}
                </p>
              )}
              {!displaySignature && (
                <p className="text-sm text-amber-600">
                  <Check className="h-4 w-4 inline mr-1" />
                  {t('bookPage.signatureRequired', texts.signatureRequired)}
                </p>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
            disabled={loading}
          >
            {viewMode ? t('common.close', 'Close') : t('common.cancel', 'Cancel')}
          </button>
          {!viewMode && (
            <button
              type="button"
              onClick={handleConfirm}
              className={`flex-1 py-2 px-4 rounded-lg font-medium ${
                canProceed
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
              disabled={loading || !canProceed}
            >
              {t('bookPage.confirmAgreement', 'Confirm & Continue')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default RentalAgreementModal;
