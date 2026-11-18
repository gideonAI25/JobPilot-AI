import { NextRequest, NextResponse } from 'next/server';
import {
  getOrCreatePrimaryProfile,
  updateProfileSection,
  mergeApprovedCVSections,
  resetCandidateProfile,
} from '@/services/server/profileDbService';
import { calculateProfileCompletion } from '@/services/profileCompletion';
import {
  validatePersonalInfo,
  validateSummary,
  validateEmploymentPreferences,
} from '@/lib/validation/profileValidation';
import { ProfileSectionId } from '@/types/profile';

export async function GET() {
  try {
    const profile = await getOrCreatePrimaryProfile();
    const completion = calculateProfileCompletion(profile);

    return NextResponse.json({
      success: true,
      profile,
      completion,
    });
  } catch (error) {
    console.error('Failed to retrieve candidate profile:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Database error loading profile',
      },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();

    // 0. Check if resetting profile to empty state
    if (body.reset) {
      const reset = await resetCandidateProfile();
      const completion = calculateProfileCompletion(reset);
      return NextResponse.json({
        success: true,
        profile: reset,
        completion,
      });
    }

    // 1. Check if merging approved CV sections
    if (body.approved && typeof body.approved === 'object') {
      const updatedProfile = await mergeApprovedCVSections(body.approved);
      const completion = calculateProfileCompletion(updatedProfile);
      return NextResponse.json({
        success: true,
        profile: updatedProfile,
        completion,
      });
    }

    // 2. Section-specific atomic update
    const { section, data } = body as { section: ProfileSectionId; data: any };

    if (!section) {
      return NextResponse.json(
        { success: false, error: 'Missing "section" identifier in update payload.' },
        { status: 400 }
      );
    }

    // Input validation based on target section
    if (section === 'personal') {
      const validation = validatePersonalInfo(data);
      if (!validation.valid) {
        return NextResponse.json(
          { success: false, error: validation.errors.join(' ') },
          { status: 422 }
        );
      }
    } else if (section === 'summary') {
      const validation = validateSummary(data);
      if (!validation.valid) {
        return NextResponse.json(
          { success: false, error: validation.errors.join(' ') },
          { status: 422 }
        );
      }
    } else if (section === 'preferences') {
      const validation = validateEmploymentPreferences(data);
      if (!validation.valid) {
        return NextResponse.json(
          { success: false, error: validation.errors.join(' ') },
          { status: 422 }
        );
      }
    }

    const updatedProfile = await updateProfileSection(section, data);
    const completion = calculateProfileCompletion(updatedProfile);

    return NextResponse.json({
      success: true,
      profile: updatedProfile,
      completion,
    });
  } catch (error) {
    console.error('Failed to update candidate profile section:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Database error updating profile',
      },
      { status: 500 }
    );
  }
}
