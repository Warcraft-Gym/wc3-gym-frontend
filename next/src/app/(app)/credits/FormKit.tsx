"use client";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { CastChips } from "@/components/CastChips";
import { CountrySelect } from "@/components/CountrySelect";
import { EditPlayerDialog, type EditPlayerDialogHandle } from "@/components/EditPlayerDialog";
import { SeasonSelect } from "@/components/SeasonSelect";
import { SeasonSignupDialog, type SeasonSignupDialogHandle } from "@/components/SeasonSignupDialog";
import { SimpleDatePicker } from "@/components/SimpleDatePicker";
import { SimpleTimePicker } from "@/components/SimpleTimePicker";

const KIT_PLAYER = {
  id: 52,
  name: "Peterian",
  country: "DE",
  battleTag: "Peterian#2345",
  discordTag: "peterian",
  discordId: "184000000000000000",
  race: "HU",
  timezone: "Europe/Berlin",
  twitch_url: "https://twitch.tv/peterian",
  youtube_url: "https://youtube.com/@peterian",
  signup_seasons: [
    { id: 19, name: "GNL S19", signup_race: "HU" },
    { id: 18, name: "GNL S18", signup_race: "NE" },
  ],
};

// A series a caster claimed, scheduled far enough back that "on now" reads false
const KIT_SERIES = {
  id: 9001,
  date_time: "2026-01-04T18:00:00Z",
  casts: [{ id: 1, name: "Peterian", user_id: 52, channel_url: "https://twitch.tv/peterian", vod_url: null }],
};

/** Every U4 component with sample props, so the render gate can see each one draw. */
export function FormKit() {
  const [day, setDay] = useState<Date | null>(new Date(2026, 8, 16));
  const [time, setTime] = useState("19:30");
  const [country, setCountry] = useState<string | null>("DE");
  const editPlayer = useRef<EditPlayerDialogHandle>(null);
  const seasonSignup = useRef<SeasonSignupDialogHandle>(null);

  return (
    <div className="mt-8 flex flex-col gap-8">
      <h2>Form kit</h2>

      <section>
        <h3>SimpleDatePicker</h3>
        <SimpleDatePicker id="kit-day" modelValue={day} onUpdateModelValue={setDay} />
      </section>

      <section>
        <h3>SimpleTimePicker</h3>
        <SimpleTimePicker id="kit-time" modelValue={time} onUpdateModelValue={setTime} />
      </section>

      <section>
        <h3>CountrySelect</h3>
        <CountrySelect id="kit-country" value={country} onChange={setCountry} />
      </section>

      <section>
        <h3>SeasonSelect</h3>
        <SeasonSelect />
      </section>

      <section>
        <h3>EditPlayerDialog</h3>
        <Button variant="outline" onClick={() => editPlayer.current?.open(KIT_PLAYER)}>
          Open the player form
        </Button>
        <EditPlayerDialog ref={editPlayer} />
      </section>

      <section>
        <h3>SeasonSignupDialog</h3>
        <Button variant="outline" onClick={() => seasonSignup.current?.open()}>
          Open the signup form
        </Button>
        <SeasonSignupDialog ref={seasonSignup} />
      </section>

      <section>
        <h3>CastChips</h3>
        <CastChips series={KIT_SERIES} />
      </section>
    </div>
  );
}

export default FormKit;
