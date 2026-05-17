import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { UserProfile } from '@/types';

export function generateCV(user: UserProfile) {
  const doc = new jsPDF();
  const primaryColor = [234, 88, 12]; // orange-600
  const textColor = [15, 23, 42]; // slate-900
  const secondaryTextColor = [100, 116, 139]; // slate-500

  // Header
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 210, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text(`${user.firstName || ''} ${user.lastName || user.displayName || ''}`, 20, 20);
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text(user.jobTitle || 'Candidat', 20, 30);

  // Contact Info
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.setFontSize(10);
  doc.text(`Email: ${user.email}`, 140, 50);
  if (user.phone) doc.text(`Tel: ${user.phone}`, 140, 55);
  if (user.location || user.city) doc.text(`Localisation: ${user.city || user.location}`, 140, 60);

  let yPos = 60;

  // Professional Summary
  if (user.sector || user.yearsOfExperience) {
    yPos += 15;
    doc.setFontSize(16);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('Profil Professionnel', 20, yPos);
    doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.line(20, yPos + 2, 80, yPos + 2);
    
    yPos += 10;
    doc.setFontSize(11);
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    const summary = `${user.yearsOfExperience || 0} années d'expérience dans le secteur ${user.sector || 'non spécifié'}.`;
    doc.text(summary, 20, yPos);
  }

  // Experience
  if (user.experiences && user.experiences.length > 0) {
    yPos += 20;
    doc.setFontSize(16);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('Expériences Professionnelles', 20, yPos);
    doc.line(20, yPos + 2, 80, yPos + 2);
    
    yPos += 10;
    user.experiences.forEach((exp) => {
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }
      doc.setFontSize(12);
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      doc.setFont('helvetica', 'bold');
      doc.text(`${exp.role} @ ${exp.company}`, 20, yPos);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(secondaryTextColor[0], secondaryTextColor[1], secondaryTextColor[2]);
      const period = `${exp.startDate} - ${exp.current ? 'Présent' : exp.endDate || ''}`;
      doc.text(period, 20, yPos + 5);
      
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      const splitDesc = doc.splitTextToSize(exp.description, 170);
      doc.text(splitDesc, 20, yPos + 12);
      
      yPos += 15 + (splitDesc.length * 5);
    });
  }

  // Education
  if (user.education && user.education.length > 0) {
    yPos += 10;
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }
    doc.setFontSize(16);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('Formations', 20, yPos);
    doc.line(20, yPos + 2, 80, yPos + 2);
    
    yPos += 10;
    user.education.forEach((edu) => {
      doc.setFontSize(11);
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      doc.setFont('helvetica', 'bold');
      doc.text(`${edu.degree} - ${edu.school}`, 20, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(edu.field, 20, yPos + 5);
      doc.setFontSize(9);
      doc.text(`${edu.startDate} - ${edu.current ? 'En cours' : edu.endDate || ''}`, 20, yPos + 10);
      yPos += 18;
    });
  }

  // Skills
  if (user.skills && user.skills.length > 0) {
    yPos += 10;
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }
    doc.setFontSize(16);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('Compétences', 20, yPos);
    doc.line(20, yPos + 2, 80, yPos + 2);
    
    yPos += 10;
    doc.setFontSize(11);
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    const skillList = user.skills.map(s => s.name).join(', ');
    const splitSkills = doc.splitTextToSize(skillList, 170);
    doc.text(splitSkills, 20, yPos);
    yPos += (splitSkills.length * 6);
  }

  // Save
  doc.save(`CV_${user.lastName || user.displayName || 'Profil'}.pdf`);
}
