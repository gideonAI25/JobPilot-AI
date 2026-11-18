import { NextRequest, NextResponse } from 'next/server';
import {
  addProfileListItem,
  updateProfileListItem,
  deleteProfileListItem,
} from '@/services/server/profileDbService';
import { calculateProfileCompletion } from '@/services/profileCompletion';
import {
  validateEducationEntry,
  validateWorkExperienceEntry,
  validateTechnicalSkillEntry,
  validateProjectEntry,
  validateCertificationEntry,
  validateStandardAnswerEntry,
} from '@/lib/validation/profileValidation';

type AllowedSectionKey =
  | 'education'
  | 'workExperience'
  | 'technicalSkills'
  | 'projects'
  | 'certifications'
  | 'standardAnswers';

function validateItem(sectionKey: AllowedSectionKey, item: any) {
  switch (sectionKey) {
    case 'education':
      return validateEducationEntry(item);
    case 'workExperience':
      return validateWorkExperienceEntry(item);
    case 'technicalSkills':
      return validateTechnicalSkillEntry(item);
    case 'projects':
      return validateProjectEntry(item);
    case 'certifications':
      return validateCertificationEntry(item);
    case 'standardAnswers':
      return validateStandardAnswerEntry(item);
    default:
      return { valid: false, errors: ['Unknown section key'] };
  }
}

export async function POST(req: NextRequest) {
  try {
    const { sectionKey, item } = (await req.json()) as {
      sectionKey: AllowedSectionKey;
      item: any;
    };

    if (!sectionKey || !item) {
      return NextResponse.json(
        { success: false, error: 'Missing sectionKey or item payload.' },
        { status: 400 }
      );
    }

    const validation = validateItem(sectionKey, item);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.errors.join(' ') },
        { status: 422 }
      );
    }

    const updatedProfile = await addProfileListItem(sectionKey, item);
    const completion = calculateProfileCompletion(updatedProfile);

    return NextResponse.json({
      success: true,
      profile: updatedProfile,
      completion,
    });
  } catch (error) {
    console.error('Failed to add profile item:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Database error adding item',
      },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { sectionKey, id, item } = (await req.json()) as {
      sectionKey: AllowedSectionKey;
      id: string;
      item: any;
    };

    if (!sectionKey || !id || !item) {
      return NextResponse.json(
        { success: false, error: 'Missing sectionKey, id, or item payload.' },
        { status: 400 }
      );
    }

    const validation = validateItem(sectionKey, item);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.errors.join(' ') },
        { status: 422 }
      );
    }

    const updatedProfile = await updateProfileListItem(sectionKey, id, item);
    const completion = calculateProfileCompletion(updatedProfile);

    return NextResponse.json({
      success: true,
      profile: updatedProfile,
      completion,
    });
  } catch (error) {
    console.error('Failed to update profile item:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Database error updating item',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sectionKey = searchParams.get('sectionKey') as AllowedSectionKey;
    const id = searchParams.get('id');

    if (!sectionKey || !id) {
      return NextResponse.json(
        { success: false, error: 'Missing sectionKey or id query parameters.' },
        { status: 400 }
      );
    }

    const updatedProfile = await deleteProfileListItem(sectionKey, id);
    const completion = calculateProfileCompletion(updatedProfile);

    return NextResponse.json({
      success: true,
      profile: updatedProfile,
      completion,
    });
  } catch (error) {
    console.error('Failed to delete profile item:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Database error deleting item',
      },
      { status: 500 }
    );
  }
}
